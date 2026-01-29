import { memo, useState, useCallback } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'
import clsx from 'clsx'
import type { Message } from '../../types/message'
import { formatTime } from '../../lib/utils/format'
import { IconButton, CopyIcon, CheckIcon, UserIcon, BotIcon, RefreshIcon } from '../ui'
import { ThinkingIndicator } from '../ui/Spinner'

interface MessageBubbleProps {
  message: Message
  isLast?: boolean
  onRegenerate?: () => void
}

export const MessageBubble = memo(function MessageBubble({
  message,
  isLast = false,
  onRegenerate,
}: MessageBubbleProps) {
  const isUser = message.role === 'user'
  const isStreaming = message.isStreaming

  return (
    <div
      className={clsx(
        'group flex gap-3 py-4 animate-fade-in',
        isUser ? 'flex-row-reverse' : 'flex-row'
      )}
    >
      {/* Avatar */}
      <div
        className={clsx(
          'flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center',
          isUser ? 'bg-accent text-white' : 'bg-surface-tertiary text-text-secondary'
        )}
      >
        {isUser ? <UserIcon className="w-4 h-4" /> : <BotIcon className="w-4 h-4" />}
      </div>

      {/* Content */}
      <div className={clsx('flex flex-col gap-1 max-w-[80%]', isUser && 'items-end')}>
        {/* Message bubble */}
        <div
          className={clsx(
            'px-4 py-3 rounded-2xl',
            isUser
              ? 'bg-accent text-white rounded-br-md'
              : 'bg-surface-secondary border border-border rounded-bl-md'
          )}
        >
          {isStreaming && !message.content ? (
            <ThinkingIndicator />
          ) : (
            <div
              className={clsx(
                'prose prose-sm max-w-none',
                isUser ? 'prose-invert' : 'dark:prose-invert'
              )}
            >
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  code({ inline, className, children, ...props }) {
                    const match = /language-(\w+)/.exec(className || '')
                    const language = match ? match[1] : ''
                    const codeString = String(children).replace(/\n$/, '')

                    if (!inline && language) {
                      return (
                        <CodeBlock language={language} code={codeString} />
                      )
                    }

                    return (
                      <code className={className} {...props}>
                        {children}
                      </code>
                    )
                  },
                }}
              >
                {message.content}
              </ReactMarkdown>
            </div>
          )}

          {/* Typing cursor for streaming */}
          {isStreaming && message.content && (
            <span className="typing-cursor" />
          )}

          {/* Error indicator */}
          {message.error && (
            <div className="mt-2 text-sm text-red-400">
              Error: {message.error}
            </div>
          )}
        </div>

        {/* Metadata and actions */}
        <div
          className={clsx(
            'flex items-center gap-2 text-2xs text-text-tertiary',
            'opacity-0 group-hover:opacity-100 transition-opacity',
            isUser && 'flex-row-reverse'
          )}
        >
          <span>{formatTime(message.createdAt)}</span>

          {!isUser && !isStreaming && (
            <>
              <CopyButton text={message.content} />
              {isLast && onRegenerate && (
                <IconButton
                  icon={<RefreshIcon className="w-3 h-3" />}
                  label="Regenerate"
                  size="sm"
                  onClick={onRegenerate}
                />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
})

/** Copy button with feedback */
function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [text])

  return (
    <IconButton
      icon={copied ? <CheckIcon className="w-3 h-3" /> : <CopyIcon className="w-3 h-3" />}
      label={copied ? 'Copied!' : 'Copy'}
      size="sm"
      onClick={handleCopy}
    />
  )
}

/** Code block with syntax highlighting and copy button */
function CodeBlock({ language, code }: { language: string; code: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [code])

  return (
    <div className="relative group/code my-3 -mx-4">
      {/* Language label and copy button */}
      <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-4 py-2 bg-[#282c34] border-b border-gray-700 rounded-t-lg">
        <span className="text-xs text-gray-400">{language}</span>
        <button
          onClick={handleCopy}
          className="text-xs text-gray-400 hover:text-white flex items-center gap-1"
        >
          {copied ? (
            <>
              <CheckIcon className="w-3 h-3" /> Copied!
            </>
          ) : (
            <>
              <CopyIcon className="w-3 h-3" /> Copy
            </>
          )}
        </button>
      </div>

      <SyntaxHighlighter
        language={language}
        style={oneDark}
        customStyle={{
          margin: 0,
          paddingTop: '3rem',
          borderRadius: '0.5rem',
          fontSize: '0.875rem',
        }}
        showLineNumbers
        lineNumberStyle={{ minWidth: '2.5em', paddingRight: '1em', color: '#636d83' }}
      >
        {code}
      </SyntaxHighlighter>
    </div>
  )
}
