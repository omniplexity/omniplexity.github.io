import { memo } from 'react'
import clsx from 'clsx'
import { useLMStudio } from '../../hooks'
import { RefreshIcon } from '../ui'

export const ConnectionStatus = memo(function ConnectionStatus() {
  const { status, error, reconnect, isConnecting } = useLMStudio()

  const statusConfig = {
    connected: {
      dot: 'status-dot-connected',
      text: 'Connected',
      textColor: 'text-green-500',
    },
    connecting: {
      dot: 'status-dot-connecting',
      text: 'Connecting...',
      textColor: 'text-yellow-500',
    },
    disconnected: {
      dot: 'status-dot-disconnected',
      text: 'Disconnected',
      textColor: 'text-red-500',
    },
    error: {
      dot: 'status-dot-disconnected',
      text: 'Error',
      textColor: 'text-red-500',
    },
  }

  const config = statusConfig[status]

  return (
    <div className="flex items-center gap-2">
      {/* Status indicator */}
      <div className="flex items-center gap-2 px-3 py-1.5 bg-surface-secondary rounded-lg border border-border">
        <span className={clsx('status-dot', config.dot)} />
        <span className={clsx('text-sm font-medium', config.textColor)}>
          {config.text}
        </span>
      </div>

      {/* Error message and retry */}
      {status === 'error' && (
        <button
          onClick={reconnect}
          disabled={isConnecting}
          className="flex items-center gap-1 px-2 py-1 text-sm text-text-secondary
                     hover:text-text hover:bg-surface-secondary rounded transition-colors"
          title={error || 'Retry connection'}
        >
          <RefreshIcon className={clsx('w-4 h-4', isConnecting && 'animate-spin')} />
          Retry
        </button>
      )}
    </div>
  )
})
