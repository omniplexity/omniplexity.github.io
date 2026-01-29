import { useRef, useEffect, memo } from 'react'
import type { Message } from '../../types/message'
import { MessageBubble } from './MessageBubble'
import { SparklesIcon } from '../ui'

interface MessageListProps {
  messages: Message[]
  isStreaming?: boolean
  onRegenerate?: () => void
}

export const MessageList = memo(function MessageList({
  messages,
  isStreaming = false,
  onRegenerate,
}: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length, messages[messages.length - 1]?.content])

  if (messages.length === 0) {
    return <EmptyState />
  }

  return (
    <div
      ref={containerRef}
      className="flex-1 overflow-y-auto px-4 md:px-8 lg:px-16"
    >
      <div className="max-w-3xl mx-auto py-4">
        {messages.map((message, index) => (
          <MessageBubble
            key={message.id}
            message={message}
            isLast={index === messages.length - 1 && !isStreaming}
            onRegenerate={index === messages.length - 1 ? onRegenerate : undefined}
          />
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  )
})

/** Empty state when no messages */
function EmptyState() {
  return (
    <div className="flex-1 flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-surface-secondary flex items-center justify-center">
          <SparklesIcon className="w-8 h-8 text-accent" />
        </div>
        <h2 className="text-xl font-semibold text-text mb-2">
          Start a conversation
        </h2>
        <p className="text-text-secondary">
          Type a message below to start chatting with your local AI. Your
          conversations are stored locally and never leave your machine.
        </p>

        {/* Suggestion chips */}
        <div className="mt-6 flex flex-wrap gap-2 justify-center">
          {SUGGESTIONS.map((suggestion) => (
            <SuggestionChip key={suggestion} text={suggestion} />
          ))}
        </div>
      </div>
    </div>
  )
}

const SUGGESTIONS = [
  'Explain quantum computing',
  'Write a Python function',
  'Help me brainstorm ideas',
  'Summarize this article',
]

function SuggestionChip({ text }: { text: string }) {
  // TODO: Connect to chat input
  return (
    <button
      className="px-3 py-1.5 text-sm text-text-secondary bg-surface-secondary
                 border border-border rounded-full hover:bg-surface-tertiary
                 hover:text-text transition-colors"
    >
      {text}
    </button>
  )
}
