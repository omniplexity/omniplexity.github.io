import { memo, useState, type ReactNode } from 'react'
import clsx from 'clsx'
import { useSettingsStore } from '../../stores'
import { IconButton, XIcon, SunIcon, MoonIcon } from '../ui'

interface SettingsModalProps {
  isOpen: boolean
  onClose: () => void
}

type Tab = 'appearance' | 'connection' | 'agent'

export const SettingsModal = memo(function SettingsModal({
  isOpen,
  onClose,
}: SettingsModalProps) {
  const [activeTab, setActiveTab] = useState<Tab>('appearance')

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Modal */}
      <div
        className={clsx(
          'relative w-full max-w-2xl max-h-[80vh]',
          'bg-surface border border-border rounded-xl shadow-xl',
          'flex flex-col animate-slide-up'
        )}
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 id="settings-title" className="text-lg font-semibold">
            Settings
          </h2>
          <IconButton
            icon={<XIcon className="w-5 h-5" />}
            label="Close settings"
            onClick={onClose}
          />
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border">
          <TabButton
            active={activeTab === 'appearance'}
            onClick={() => setActiveTab('appearance')}
          >
            Appearance
          </TabButton>
          <TabButton
            active={activeTab === 'connection'}
            onClick={() => setActiveTab('connection')}
          >
            Connection
          </TabButton>
          <TabButton
            active={activeTab === 'agent'}
            onClick={() => setActiveTab('agent')}
          >
            Agent
          </TabButton>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'appearance' && <AppearanceTab />}
          {activeTab === 'connection' && <ConnectionTab />}
          {activeTab === 'agent' && <AgentTab />}
        </div>
      </div>
    </div>
  )
})

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        'px-4 py-2.5 text-sm font-medium transition-colors',
        'border-b-2 -mb-px',
        active
          ? 'border-accent text-accent'
          : 'border-transparent text-text-secondary hover:text-text'
      )}
    >
      {children}
    </button>
  )
}

function AppearanceTab() {
  const { theme, setTheme, fontSize, setFontSize } = useSettingsStore()

  return (
    <div className="space-y-6">
      {/* Theme */}
      <SettingSection title="Theme" description="Choose your preferred color scheme">
        <div className="flex gap-2">
          <ThemeOption
            label="Light"
            icon={<SunIcon className="w-5 h-5" />}
            active={theme === 'light'}
            onClick={() => setTheme('light')}
          />
          <ThemeOption
            label="Dark"
            icon={<MoonIcon className="w-5 h-5" />}
            active={theme === 'dark'}
            onClick={() => setTheme('dark')}
          />
          <ThemeOption
            label="System"
            icon={
              <div className="w-5 h-5 rounded-full bg-gradient-to-br from-yellow-400 to-blue-600" />
            }
            active={theme === 'system'}
            onClick={() => setTheme('system')}
          />
        </div>
      </SettingSection>

      {/* Font size */}
      <SettingSection title="Font Size" description="Adjust the text size in chat">
        <div className="flex gap-2">
          {(['small', 'medium', 'large'] as const).map((size) => (
            <button
              key={size}
              onClick={() => setFontSize(size)}
              className={clsx(
                'px-4 py-2 text-sm rounded-lg border transition-colors capitalize',
                fontSize === size
                  ? 'bg-accent text-white border-accent'
                  : 'bg-surface-secondary border-border hover:bg-surface-tertiary'
              )}
            >
              {size}
            </button>
          ))}
        </div>
      </SettingSection>
    </div>
  )
}

function ThemeOption({
  label,
  icon,
  active,
  onClick,
}: {
  label: string
  icon: ReactNode
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        'flex items-center gap-2 px-4 py-3 rounded-lg border transition-colors',
        active
          ? 'bg-accent/10 border-accent text-accent'
          : 'bg-surface-secondary border-border hover:bg-surface-tertiary'
      )}
    >
      {icon}
      <span className="font-medium">{label}</span>
    </button>
  )
}

function ConnectionTab() {
  const { lmStudioUrl, setLMStudioUrl, temperature, setTemperature, maxTokens, setMaxTokens } =
    useSettingsStore()

  return (
    <div className="space-y-6">
      {/* LM Studio URL */}
      <SettingSection
        title="LM Studio URL"
        description="The URL of your local LM Studio server"
      >
        <input
          type="text"
          value={lmStudioUrl}
          onChange={(e) => setLMStudioUrl(e.target.value)}
          placeholder="http://127.0.0.1:1234/v1"
          className={clsx(
            'w-full px-3 py-2 text-sm rounded-lg',
            'bg-surface-secondary border border-border',
            'focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/20'
          )}
        />
        <p className="mt-1 text-xs text-text-tertiary">
          Default: http://127.0.0.1:1234/v1 — Make sure LM Studio is running with
          "Start Server" enabled
        </p>
      </SettingSection>

      {/* Temperature */}
      <SettingSection
        title="Temperature"
        description="Controls randomness in responses (0 = deterministic, 1 = creative)"
      >
        <div className="flex items-center gap-4">
          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={temperature}
            onChange={(e) => setTemperature(parseFloat(e.target.value))}
            className="flex-1 accent-accent"
          />
          <span className="w-12 text-sm font-mono text-text-secondary">
            {temperature.toFixed(1)}
          </span>
        </div>
      </SettingSection>

      {/* Max tokens */}
      <SettingSection
        title="Max Tokens"
        description="Maximum number of tokens in the response"
      >
        <div className="flex items-center gap-4">
          <input
            type="range"
            min="256"
            max="8192"
            step="256"
            value={maxTokens}
            onChange={(e) => setMaxTokens(parseInt(e.target.value))}
            className="flex-1 accent-accent"
          />
          <span className="w-16 text-sm font-mono text-text-secondary">{maxTokens}</span>
        </div>
      </SettingSection>
    </div>
  )
}

function AgentTab() {
  const { agentConfig, setAgentConfig } = useSettingsStore()

  return (
    <div className="space-y-6">
      {/* Enable agent */}
      <SettingSection
        title="Agent Mode"
        description="Enable ReAct-style reasoning for complex tasks"
      >
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={agentConfig.enabled}
            onChange={(e) => setAgentConfig({ enabled: e.target.checked })}
            className="w-5 h-5 rounded accent-accent"
          />
          <span className="text-sm">Enable agent mode</span>
        </label>
      </SettingSection>

      {/* System prompt */}
      <SettingSection
        title="System Prompt"
        description="Instructions for the AI agent"
      >
        <textarea
          value={agentConfig.systemPrompt}
          onChange={(e) => setAgentConfig({ systemPrompt: e.target.value })}
          rows={6}
          className={clsx(
            'w-full px-3 py-2 text-sm rounded-lg font-mono',
            'bg-surface-secondary border border-border resize-none',
            'focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/20'
          )}
        />
      </SettingSection>

      {/* Max iterations */}
      <SettingSection
        title="Max Iterations"
        description="Maximum reasoning steps before forcing an answer"
      >
        <div className="flex items-center gap-4">
          <input
            type="range"
            min="1"
            max="10"
            value={agentConfig.maxIterations}
            onChange={(e) => setAgentConfig({ maxIterations: parseInt(e.target.value) })}
            className="flex-1 accent-accent"
          />
          <span className="w-8 text-sm font-mono text-text-secondary">
            {agentConfig.maxIterations}
          </span>
        </div>
      </SettingSection>

      {/* Tools */}
      <SettingSection title="Available Tools" description="Enable or disable agent tools">
        <div className="space-y-2">
          {agentConfig.tools.map((tool, index) => (
            <label key={tool.name} className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={tool.enabled}
                onChange={(e) => {
                  const newTools = [...agentConfig.tools]
                  newTools[index] = { ...tool, enabled: e.target.checked }
                  setAgentConfig({ tools: newTools })
                }}
                className="w-4 h-4 rounded accent-accent"
              />
              <div>
                <span className="text-sm font-medium">{tool.name}</span>
                <p className="text-xs text-text-secondary">{tool.description}</p>
              </div>
            </label>
          ))}
        </div>
      </SettingSection>
    </div>
  )
}

function SettingSection({
  title,
  description,
  children,
}: {
  title: string
  description: string
  children: ReactNode
}) {
  return (
    <div>
      <h3 className="text-sm font-medium mb-1">{title}</h3>
      <p className="text-xs text-text-secondary mb-3">{description}</p>
      {children}
    </div>
  )
}
