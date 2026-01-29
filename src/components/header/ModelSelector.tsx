import { memo, useState, useRef, useEffect } from 'react'
import clsx from 'clsx'
import { useLMStudio } from '../../hooks'
import { ChevronDownIcon, CheckIcon, BotIcon } from '../ui'

export const ModelSelector = memo(function ModelSelector() {
  const { models, selectedModel, selectModel, isConnected } = useLMStudio()
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const selectedModelName = selectedModel
    ? models.find((m) => m.id === selectedModel)?.name || selectedModel
    : 'Select model'

  if (!isConnected || models.length === 0) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 text-sm text-text-secondary bg-surface-secondary rounded-lg border border-border opacity-50">
        <BotIcon className="w-4 h-4" />
        <span>No models available</span>
      </div>
    )
  }

  return (
    <div ref={dropdownRef} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={clsx(
          'flex items-center gap-2 px-3 py-2 text-sm',
          'bg-surface-secondary rounded-lg border border-border',
          'hover:bg-surface-tertiary transition-colors',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-accent'
        )}
      >
        <BotIcon className="w-4 h-4 text-text-secondary" />
        <span className="font-medium max-w-[150px] truncate">{selectedModelName}</span>
        <ChevronDownIcon
          className={clsx(
            'w-4 h-4 text-text-secondary transition-transform',
            isOpen && 'rotate-180'
          )}
        />
      </button>

      {/* Dropdown menu */}
      {isOpen && (
        <div
          className={clsx(
            'absolute top-full left-0 mt-1 w-64 z-50',
            'bg-surface border border-border rounded-lg shadow-lg',
            'max-h-64 overflow-y-auto',
            'animate-fade-in'
          )}
        >
          {models.map((model) => (
            <button
              key={model.id}
              onClick={() => {
                selectModel(model.id)
                setIsOpen(false)
              }}
              className={clsx(
                'w-full flex items-center gap-2 px-3 py-2 text-left text-sm',
                'hover:bg-surface-secondary transition-colors',
                selectedModel === model.id && 'bg-surface-secondary'
              )}
            >
              <span className="flex-1 truncate">{model.name}</span>
              {selectedModel === model.id && (
                <CheckIcon className="w-4 h-4 text-accent" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
})
