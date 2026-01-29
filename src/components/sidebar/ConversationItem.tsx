import { memo, useState, useCallback } from 'react'
import clsx from 'clsx'
import type { Conversation } from '../../types/conversation'
import { formatRelativeTime } from '../../lib/utils/format'
import { IconButton, TrashIcon, MessageIcon } from '../ui'

interface ConversationItemProps {
  conversation: Conversation
  isActive: boolean
  onSelect: () => void
  onDelete: () => void
}

export const ConversationItem = memo(function ConversationItem({
  conversation,
  isActive,
  onSelect,
  onDelete,
}: ConversationItemProps) {
  const [showDelete, setShowDelete] = useState(false)

  const handleDelete = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      onDelete()
    },
    [onDelete]
  )

  return (
    <button
      onClick={onSelect}
      onMouseEnter={() => setShowDelete(true)}
      onMouseLeave={() => setShowDelete(false)}
      className={clsx(
        'w-full flex items-start gap-3 px-3 py-2.5 rounded-lg text-left',
        'transition-colors group',
        isActive
          ? 'bg-surface-tertiary'
          : 'hover:bg-surface-secondary'
      )}
    >
      {/* Icon */}
      <MessageIcon className="w-4 h-4 mt-0.5 text-text-secondary flex-shrink-0" />

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className="font-medium text-sm truncate">{conversation.title}</span>
          <span className="text-2xs text-text-tertiary flex-shrink-0">
            {formatRelativeTime(conversation.updatedAt)}
          </span>
        </div>

        {conversation.preview && (
          <p className="text-xs text-text-secondary truncate mt-0.5">
            {conversation.preview}
          </p>
        )}
      </div>

      {/* Delete button */}
      <div
        className={clsx(
          'flex-shrink-0 transition-opacity',
          showDelete ? 'opacity-100' : 'opacity-0'
        )}
      >
        <IconButton
          icon={<TrashIcon className="w-4 h-4" />}
          label="Delete conversation"
          size="sm"
          onClick={handleDelete}
          className="hover:text-red-500"
        />
      </div>
    </button>
  )
})
