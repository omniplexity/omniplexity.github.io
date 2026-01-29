import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { DEFAULT_AGENT_CONFIG, type AgentConfig } from '../types/agent'

export type Theme = 'light' | 'dark' | 'system'

interface SettingsState {
  // Appearance
  theme: Theme
  fontSize: 'small' | 'medium' | 'large'

  // LM Studio connection
  lmStudioUrl: string

  // Chat settings
  defaultModel: string | null
  temperature: number
  maxTokens: number
  streamingEnabled: boolean

  // Agent settings
  agentConfig: AgentConfig

  // Actions
  setTheme: (theme: Theme) => void
  setFontSize: (size: 'small' | 'medium' | 'large') => void
  setLMStudioUrl: (url: string) => void
  setDefaultModel: (model: string | null) => void
  setTemperature: (temp: number) => void
  setMaxTokens: (tokens: number) => void
  setStreamingEnabled: (enabled: boolean) => void
  setAgentConfig: (config: Partial<AgentConfig>) => void
  resetSettings: () => void
}

const initialState = {
  theme: 'system' as Theme,
  fontSize: 'medium' as const,
  lmStudioUrl: 'http://127.0.0.1:1234/v1',
  defaultModel: null,
  temperature: 0.7,
  maxTokens: 2048,
  streamingEnabled: true,
  agentConfig: DEFAULT_AGENT_CONFIG,
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      ...initialState,

      setTheme: (theme) => {
        set({ theme })
        applyTheme(theme)
      },

      setFontSize: (fontSize) => set({ fontSize }),

      setLMStudioUrl: (lmStudioUrl) => set({ lmStudioUrl }),

      setDefaultModel: (defaultModel) => set({ defaultModel }),

      setTemperature: (temperature) => set({ temperature }),

      setMaxTokens: (maxTokens) => set({ maxTokens }),

      setStreamingEnabled: (streamingEnabled) => set({ streamingEnabled }),

      setAgentConfig: (config) =>
        set((state) => ({
          agentConfig: { ...state.agentConfig, ...config },
        })),

      resetSettings: () => {
        set(initialState)
        applyTheme('system')
      },
    }),
    {
      name: 'omniai-settings',
      partialize: (state) => ({
        theme: state.theme,
        fontSize: state.fontSize,
        lmStudioUrl: state.lmStudioUrl,
        defaultModel: state.defaultModel,
        temperature: state.temperature,
        maxTokens: state.maxTokens,
        streamingEnabled: state.streamingEnabled,
        agentConfig: state.agentConfig,
      }),
      onRehydrateStorage: () => (state) => {
        // Apply theme on hydration
        if (state?.theme) {
          applyTheme(state.theme)
        }
      },
    }
  )
)

/** Apply theme to document */
function applyTheme(theme: Theme): void {
  const root = document.documentElement
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches

  if (theme === 'dark' || (theme === 'system' && prefersDark)) {
    root.classList.add('dark')
  } else {
    root.classList.remove('dark')
  }

  // Store for initial load script
  localStorage.setItem('omniai-theme', theme)
}

// Initialize theme on module load
if (typeof window !== 'undefined') {
  const savedTheme = localStorage.getItem('omniai-theme') as Theme | null
  applyTheme(savedTheme || 'system')
}
