import { memo } from 'react'
import { useChatStore, useSettingsStore } from '../../stores'
import { IconButton, MenuIcon, PlusIcon, SettingsIcon, MoonIcon, SunIcon } from '../ui'
import { ConnectionStatus } from './ConnectionStatus'
import { ModelSelector } from './ModelSelector'

interface HeaderProps {
  onOpenSettings?: () => void
}

export const Header = memo(function Header({ onOpenSettings }: HeaderProps) {
  const { toggleSidebar, sidebarOpen, startNewConversation } = useChatStore((s) => ({
    toggleSidebar: s.toggleSidebar,
    sidebarOpen: s.sidebarOpen,
    startNewConversation: async () => {
      s.setActiveConversation(null)
      s.setMessages([])
    },
  }))

  const { theme, setTheme } = useSettingsStore((s) => ({
    theme: s.theme,
    setTheme: s.setTheme,
  }))

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : theme === 'light' ? 'system' : 'dark')
  }

  const themeIcon =
    theme === 'dark' ? (
      <MoonIcon className="w-5 h-5" />
    ) : theme === 'light' ? (
      <SunIcon className="w-5 h-5" />
    ) : (
      <SunIcon className="w-5 h-5" />
    )

  return (
    <header className="flex items-center justify-between px-4 py-3 border-b border-border bg-surface safe-area-top">
      {/* Left section */}
      <div className="flex items-center gap-2">
        <IconButton
          icon={<MenuIcon className="w-5 h-5" />}
          label={sidebarOpen ? 'Close sidebar' : 'Open sidebar'}
          onClick={toggleSidebar}
          active={sidebarOpen}
        />

        <IconButton
          icon={<PlusIcon className="w-5 h-5" />}
          label="New chat"
          onClick={startNewConversation}
        />

        <div className="hidden sm:block">
          <ModelSelector />
        </div>
      </div>

      {/* Center - Title (mobile only) */}
      <div className="sm:hidden">
        <h1 className="text-lg font-semibold">OmniAI</h1>
      </div>

      {/* Right section */}
      <div className="flex items-center gap-2">
        <div className="hidden sm:block">
          <ConnectionStatus />
        </div>

        <IconButton
          icon={themeIcon}
          label={`Theme: ${theme}`}
          onClick={toggleTheme}
        />

        <IconButton
          icon={<SettingsIcon className="w-5 h-5" />}
          label="Settings"
          onClick={onOpenSettings}
        />
      </div>
    </header>
  )
})
