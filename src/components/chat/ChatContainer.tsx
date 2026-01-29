import { useCallback } from 'react'
import { useChat, useLMStudio } from '../../hooks'
import { MessageList } from './MessageList'
import { ChatInput } from './ChatInput'

export function ChatContainer() {
  const {
    messages,
    isStreaming,
    inputValue,
    setInputValue,
    sendMessage,
    cancelStream,
    regenerateLastMessage,
  } = useChat()

  const { isConnected } = useLMStudio()

  const handleSend = useCallback(() => {
    if (inputValue.trim()) {
      sendMessage(inputValue)
      setInputValue('')
    }
  }, [inputValue, sendMessage, setInputValue])

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <MessageList
        messages={messages}
        isStreaming={isStreaming}
        onRegenerate={regenerateLastMessage}
      />

      <ChatInput
        value={inputValue}
        onChange={setInputValue}
        onSend={handleSend}
        onCancel={cancelStream}
        isStreaming={isStreaming}
        disabled={!isConnected}
        placeholder={
          isConnected
            ? 'Type a message...'
            : 'Connect to LM Studio to start chatting...'
        }
      />
    </div>
  )
}
