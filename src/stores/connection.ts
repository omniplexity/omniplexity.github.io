import { create } from 'zustand'
import type { ModelInfo } from '../types/model'

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error'

interface ConnectionState {
  status: ConnectionStatus
  error: string | null
  lastChecked: number | null
  models: ModelInfo[]
  selectedModel: string | null

  // Actions
  setStatus: (status: ConnectionStatus, error?: string) => void
  setModels: (models: ModelInfo[]) => void
  selectModel: (modelId: string | null) => void
  clearError: () => void
}

export const useConnectionStore = create<ConnectionState>((set) => ({
  status: 'disconnected',
  error: null,
  lastChecked: null,
  models: [],
  selectedModel: null,

  setStatus: (status, error) =>
    set({
      status,
      error: error ?? null,
      lastChecked: Date.now(),
    }),

  setModels: (models) =>
    set((state) => ({
      models,
      // Auto-select first model if none selected
      selectedModel: state.selectedModel ?? models[0]?.id ?? null,
    })),

  selectModel: (modelId) => set({ selectedModel: modelId }),

  clearError: () => set({ error: null }),
}))
