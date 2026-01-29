import { useEffect, useCallback } from 'react'

type KeyHandler = (event: KeyboardEvent) => void

interface ShortcutConfig {
  key: string
  ctrl?: boolean
  meta?: boolean
  shift?: boolean
  alt?: boolean
  handler: KeyHandler
  /** Prevent default browser behavior */
  preventDefault?: boolean
  /** Only trigger when no input is focused */
  requireNoInput?: boolean
}

export function useKeyboardShortcuts(shortcuts: ShortcutConfig[]) {
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      // Check if we're in an input/textarea
      const isInputFocused =
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement ||
        (event.target as HTMLElement)?.isContentEditable

      for (const shortcut of shortcuts) {
        // Skip if requires no input but input is focused
        if (shortcut.requireNoInput && isInputFocused) continue

        // Check modifier keys
        const ctrlMatch = shortcut.ctrl ? event.ctrlKey : !event.ctrlKey
        const metaMatch = shortcut.meta ? event.metaKey : !event.metaKey
        const shiftMatch = shortcut.shift ? event.shiftKey : !event.shiftKey
        const altMatch = shortcut.alt ? event.altKey : !event.altKey

        // Support both Ctrl and Cmd for cross-platform
        const modifierMatch =
          (shortcut.ctrl || shortcut.meta)
            ? (event.ctrlKey || event.metaKey) && shiftMatch && altMatch
            : ctrlMatch && metaMatch && shiftMatch && altMatch

        // Check key
        const keyMatch = event.key.toLowerCase() === shortcut.key.toLowerCase()

        if (modifierMatch && keyMatch) {
          if (shortcut.preventDefault !== false) {
            event.preventDefault()
          }
          shortcut.handler(event)
          break
        }
      }
    },
    [shortcuts]
  )

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])
}

/** Common shortcuts hook for the chat interface */
export function useChatShortcuts(handlers: {
  onNewChat?: () => void
  onSend?: () => void
  onCancel?: () => void
  onToggleSidebar?: () => void
  onFocusInput?: () => void
}) {
  useKeyboardShortcuts([
    // Cmd/Ctrl + N: New chat
    {
      key: 'n',
      meta: true,
      handler: () => handlers.onNewChat?.(),
      requireNoInput: true,
    },
    // Cmd/Ctrl + Enter: Send message
    {
      key: 'Enter',
      meta: true,
      handler: () => handlers.onSend?.(),
    },
    // Escape: Cancel streaming
    {
      key: 'Escape',
      handler: () => handlers.onCancel?.(),
    },
    // Cmd/Ctrl + B: Toggle sidebar
    {
      key: 'b',
      meta: true,
      handler: () => handlers.onToggleSidebar?.(),
      requireNoInput: true,
    },
    // Cmd/Ctrl + /: Focus input
    {
      key: '/',
      meta: true,
      handler: () => handlers.onFocusInput?.(),
      requireNoInput: true,
    },
  ])
}
