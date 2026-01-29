import { useRef, useCallback, type KeyboardEvent, type ChangeEvent, memo } from 'react'
import clsx from 'clsx'
import { IconButton, SendIcon, StopIcon } from '../ui'

interface ChatInputProps {
  value: string
  onChange: (value: string) => void
  onSend: () => void
  onCancel?: () => void
  isStreaming?: boolean
  disabled?: boolean
  placeholder?: string
}

export const ChatInput = memo(function ChatInput({
  value,
  onChange,
  onSend,
  onCancel,
  isStreaming = false,
  disabled = false,
  placeholder = 'Type a message...',
}: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Auto-resize textarea
  const handleChange = useCallback(
    (e: ChangeEvent<HTMLTextAreaElement>) => {
      onChange(e.target.value)
      // Reset height to auto to get accurate scrollHeight
      e.target.style.height = 'auto'
      // Set to scrollHeight, capped at max-height (200px)
      e.target.style.height = `${Math.min(e.target.scrollHeight, 200)}px`
    },
    [onChange]
  )

  // Handle keyboard shortcuts
  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      // Cmd/Ctrl + Enter to send
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault()
        if (!disabled && !isStreaming && value.trim()) {
          onSend()
          // Reset textarea height
          if (textareaRef.current) {
            textareaRef.current.style.height = 'auto'
          }
        }
      }

      // Escape to cancel streaming
      if (e.key === 'Escape' && isStreaming && onCancel) {
        e.preventDefault()
        onCancel()
      }
    },
    [disabled, isStreaming, onCancel, onSend, value]
  )

  const handleSendClick = useCallback(() => {
    if (!disabled && !isStreaming && value.trim()) {
      onSend()
      // Reset textarea height
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto'
      }
    }
  }, [disabled, isStreaming, onSend, value])

  const canSend = !disabled && !isStreaming && value.trim().length > 0

  return (
    <div className="border-t border-border bg-surface safe-area-bottom">
      <div className="max-w-3xl mx-auto px-4 py-3">
        <div
          className={clsx(
            'flex items-end gap-2 p-2 rounded-xl',
            'bg-surface-secondary border border-border',
            'focus-within:border-accent focus-within:ring-1 focus-within:ring-accent/20',
            'transition-colors'
          )}
        >
          <textarea
            ref={textareaRef}
            value={value}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled}
            rows={1}
            className={clsx(
              'flex-1 resize-none bg-transparent border-0 outline-none',
              'text-text placeholder-text-tertiary',
              'text-base leading-relaxed px-2 py-1',
              'min-h-[24px] max-h-[200px]',
              'disabled:opacity-50 disabled:cursor-not-allowed'
            )}
            style={{ height: 'auto' }}
          />

          {/* Send / Stop button */}
          {isStreaming ? (
            <IconButton
              icon={<StopIcon className="w-5 h-5" />}
              label="Stop generating"
              onClick={onCancel}
              className="bg-red-500 text-white hover:bg-red-600"
            />
          ) : (
            <IconButton
              icon={<SendIcon className="w-5 h-5" />}
              label="Send message"
              onClick={handleSendClick}
              disabled={!canSend}
              className={clsx(
                canSend
                  ? 'bg-accent text-white hover:bg-accent-hover'
                  : 'text-text-tertiary'
              )}
            />
          )}
        </div>

        {/* Hint text */}
        <div className="mt-2 text-center text-2xs text-text-tertiary">
          <kbd className="px-1.5 py-0.5 bg-surface-tertiary rounded text-text-secondary">
            ⌘
          </kbd>
          {' + '}
          <kbd className="px-1.5 py-0.5 bg-surface-tertiary rounded text-text-secondary">
            Enter
          </kbd>
          {' to send'}
          {isStreaming && (
            <>
              {' · '}
              <kbd className="px-1.5 py-0.5 bg-surface-tertiary rounded text-text-secondary">
                Esc
              </kbd>
              {' to cancel'}
            </>
          )}
        </div>
      </div>
    </div>
  )
})
