import { useCallback, useRef } from 'react'
import { lmStudioClient } from '../lib/lmstudio'
import { useChatStore } from '../stores/chat'
import { useConnectionStore } from '../stores/connection'
import { useSettingsStore } from '../stores/settings'
import {
  createConversation,
  createMessage,
  getMessages,
  updateMessage as updateDbMessage,
} from '../lib/db'
import type { Message } from '../types/message'
import type { ChatMessage } from '../lib/lmstudio/types'

export function useChat() {
  const {
    activeConversation,
    messages,
    isStreaming,
    inputValue,
    setActiveConversation,
    setMessages,
    addMessage,
    updateMessage,
    setIsStreaming,
    setStreamingMessageId,
    setInputValue,
  } = useChatStore()

  const { selectedModel, isConnected } = useConnectionStore((s) => ({
    selectedModel: s.selectedModel,
    isConnected: s.status === 'connected',
  }))

  const { temperature, maxTokens, streamingEnabled, agentConfig } = useSettingsStore()

  const abortControllerRef = useRef<AbortController | null>(null)

  /** Load messages for a conversation */
  const loadConversation = useCallback(
    async (conversationId: string) => {
      const msgs = await getMessages(conversationId)
      setMessages(msgs)
    },
    [setMessages]
  )

  /** Start a new conversation */
  const startNewConversation = useCallback(async () => {
    const conversation = await createConversation('New Chat', selectedModel ?? undefined)
    setActiveConversation(conversation)
    setMessages([])
    return conversation
  }, [selectedModel, setActiveConversation, setMessages])

  /** Send a message and get streaming response */
  const sendMessage = useCallback(
    async (content: string) => {
      if (!content.trim() || !isConnected || isStreaming) return

      // Ensure we have a conversation
      let conversation = activeConversation
      if (!conversation) {
        conversation = await startNewConversation()
      }

      // Create user message
      const userMessage = await createMessage(conversation.id, 'user', content)
      addMessage(userMessage)

      // Create placeholder for assistant message
      const assistantId = crypto.randomUUID()
      const assistantMessage: Message = {
        id: assistantId,
        conversationId: conversation.id,
        role: 'assistant',
        content: '',
        createdAt: Date.now(),
        isStreaming: true,
      }
      addMessage(assistantMessage)

      setIsStreaming(true)
      setStreamingMessageId(assistantId)

      // Build messages array for API
      const chatMessages: ChatMessage[] = [
        // Include system prompt if agent is enabled
        ...(agentConfig.enabled
          ? [{ role: 'system' as const, content: agentConfig.systemPrompt }]
          : []),
        // Include conversation history
        ...messages.map((m) => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        })),
        // Add current user message
        { role: 'user' as const, content },
      ]

      // Create abort controller
      abortControllerRef.current = new AbortController()

      let fullContent = ''

      try {
        if (streamingEnabled) {
          // Streaming response
          const stream = lmStudioClient.chatCompletionStream(
            {
              model: selectedModel || 'default',
              messages: chatMessages,
              temperature: agentConfig.enabled ? agentConfig.temperature : temperature,
              max_tokens: maxTokens,
            },
            abortControllerRef.current.signal
          )

          for await (const chunk of stream) {
            const delta = chunk.choices[0]?.delta?.content
            if (delta) {
              fullContent += delta
              updateMessage(assistantId, { content: fullContent })
            }

            // Check for completion
            if (chunk.choices[0]?.finish_reason) {
              break
            }
          }
        } else {
          // Non-streaming response
          const response = await lmStudioClient.chatCompletion({
            model: selectedModel || 'default',
            messages: chatMessages,
            temperature,
            max_tokens: maxTokens,
          })

          fullContent = response.choices[0]?.message?.content || ''
        }

        // Save completed message to database
        await createMessage(conversation.id, 'assistant', fullContent)

        // Update the placeholder message (remove streaming flag)
        updateMessage(assistantId, {
          content: fullContent,
          isStreaming: false,
        })
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'An error occurred'

        // Check if it was cancelled
        if (errorMessage.includes('aborted') || errorMessage.includes('abort')) {
          updateMessage(assistantId, {
            content: fullContent || '*Message cancelled*',
            isStreaming: false,
          })
        } else {
          updateMessage(assistantId, {
            content: fullContent || '',
            isStreaming: false,
            error: errorMessage,
          })
        }
      } finally {
        setIsStreaming(false)
        setStreamingMessageId(null)
        abortControllerRef.current = null
      }
    },
    [
      activeConversation,
      addMessage,
      agentConfig,
      isConnected,
      isStreaming,
      maxTokens,
      messages,
      selectedModel,
      setIsStreaming,
      setStreamingMessageId,
      startNewConversation,
      streamingEnabled,
      temperature,
      updateMessage,
    ]
  )

  /** Cancel the current stream */
  const cancelStream = useCallback(() => {
    abortControllerRef.current?.abort()
    lmStudioClient.cancelStream()
  }, [])

  /** Regenerate the last assistant message */
  const regenerateLastMessage = useCallback(async () => {
    if (messages.length < 2 || isStreaming) return

    // Find the last user message
    const lastUserIndex = messages.findLastIndex((m) => m.role === 'user')
    if (lastUserIndex === -1) return

    const lastUserMessage = messages[lastUserIndex]
    if (!lastUserMessage) return

    // Remove messages after the last user message from UI
    const newMessages = messages.slice(0, lastUserIndex + 1)
    setMessages(newMessages)

    // Re-send the last user message
    // We need to temporarily set inputValue and clear messages after last user
    await sendMessage(lastUserMessage.content)
  }, [messages, isStreaming, setMessages, sendMessage])

  return {
    // State
    activeConversation,
    messages,
    isStreaming,
    inputValue,

    // Actions
    setInputValue,
    sendMessage,
    cancelStream,
    loadConversation,
    startNewConversation,
    setActiveConversation,
    regenerateLastMessage,

    // Computed
    canSend: isConnected && !isStreaming && inputValue.trim().length > 0,
  }
}
