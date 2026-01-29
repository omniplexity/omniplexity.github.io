import { useState, useCallback, Suspense, lazy } from 'react'
import { useLMStudio, useChatShortcuts } from './hooks'
import { useChatStore } from './stores'
import { Header } from './components/header'
import { Sidebar } from './components/sidebar'
import { ChatContainer } from './components/chat'
import { Spinner } from './components/ui'

// Lazy load settings modal
const SettingsModal = lazy(() =>
  import('./components/settings/SettingsModal').then((m) => ({ default: m.SettingsModal }))
)

export function App() {
  const [settingsOpen, setSettingsOpen] = useState(false)

  // Initialize LM Studio connection
  useLMStudio()

  // Chat store actions for shortcuts
  const { toggleSidebar, setInputValue } = useChatStore((s) => ({
    toggleSidebar: s.toggleSidebar,
    setInputValue: s.setInputValue,
  }))

  // Global keyboard shortcuts
  useChatShortcuts({
    onNewChat: () => {
      useChatStore.getState().setActiveConversation(null)
      useChatStore.getState().setMessages([])
    },
    onToggleSidebar: toggleSidebar,
    onFocusInput: () => {
      const input = document.querySelector('textarea')
      input?.focus()
    },
  })

  const openSettings = useCallback(() => setSettingsOpen(true), [])
  const closeSettings = useCallback(() => setSettingsOpen(false), [])

  return (
    <div className="flex h-full bg-surface">
      {/* Sidebar */}
      <Sidebar />

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        <Header onOpenSettings={openSettings} />
        <ChatContainer />
      </div>

      {/* Settings modal (lazy loaded) */}
      {settingsOpen && (
        <Suspense
          fallback={
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <Spinner size="lg" />
            </div>
          }
        >
          <SettingsModal isOpen={settingsOpen} onClose={closeSettings} />
        </Suspense>
      )}
    </div>
  )
}
