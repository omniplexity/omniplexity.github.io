export interface ModelInfo {
  id: string
  name: string
  /** Context window size */
  contextLength?: number
  /** Whether the model supports function calling */
  supportsFunctions?: boolean
  /** Model family (llama, mistral, etc.) */
  family?: string
}

export interface ProviderStatus {
  connected: boolean
  lastChecked: number
  error?: string
  models: ModelInfo[]
  activeModel?: string
}
