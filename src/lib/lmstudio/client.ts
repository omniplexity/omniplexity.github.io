import type {
  LMStudioConfig,
  ChatCompletionRequest,
  ChatCompletionResponse,
  ChatCompletionChunk,
  ModelListResponse,
  LMStudioError,
} from './types'

const DEFAULT_CONFIG: LMStudioConfig = {
  baseUrl: 'http://127.0.0.1:1234/v1',
  timeout: 120000, // 2 minutes
}

export class LMStudioClient {
  private config: LMStudioConfig
  private abortController: AbortController | null = null

  constructor(config: Partial<LMStudioConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
  }

  /** Update the base URL */
  setBaseUrl(url: string): void {
    this.config.baseUrl = url.replace(/\/$/, '') // Remove trailing slash
  }

  /** Get current base URL */
  getBaseUrl(): string {
    return this.config.baseUrl
  }

  /** Check if LM Studio is reachable */
  async healthCheck(): Promise<{ ok: boolean; error?: string }> {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 5000)

      const response = await fetch(`${this.config.baseUrl}/models`, {
        method: 'GET',
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        return { ok: false, error: `HTTP ${response.status}` }
      }

      return { ok: true }
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          return { ok: false, error: 'Connection timeout' }
        }
        return { ok: false, error: error.message }
      }
      return { ok: false, error: 'Unknown error' }
    }
  }

  /** List available models */
  async listModels(): Promise<ModelListResponse> {
    const response = await fetch(`${this.config.baseUrl}/models`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    })

    if (!response.ok) {
      const error = (await response.json()) as LMStudioError
      throw new Error(error.error?.message || `HTTP ${response.status}`)
    }

    return response.json()
  }

  /** Send a chat completion request (non-streaming) */
  async chatCompletion(request: ChatCompletionRequest): Promise<ChatCompletionResponse> {
    const response = await fetch(`${this.config.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...request, stream: false }),
    })

    if (!response.ok) {
      const error = (await response.json()) as LMStudioError
      throw new Error(error.error?.message || `HTTP ${response.status}`)
    }

    return response.json()
  }

  /** Send a streaming chat completion request */
  async *chatCompletionStream(
    request: ChatCompletionRequest,
    signal?: AbortSignal
  ): AsyncGenerator<ChatCompletionChunk, void, unknown> {
    // Create internal abort controller that can be cancelled
    this.abortController = new AbortController()

    // Link external signal if provided
    if (signal) {
      signal.addEventListener('abort', () => this.abortController?.abort())
    }

    const response = await fetch(`${this.config.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'text/event-stream',
      },
      body: JSON.stringify({ ...request, stream: true }),
      signal: this.abortController.signal,
    })

    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}`
      try {
        const error = (await response.json()) as LMStudioError
        errorMessage = error.error?.message || errorMessage
      } catch {
        // Ignore JSON parse errors
      }
      throw new Error(errorMessage)
    }

    if (!response.body) {
      throw new Error('No response body')
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    try {
      while (true) {
        const { done, value } = await reader.read()

        if (done) break

        buffer += decoder.decode(value, { stream: true })

        // Process complete SSE messages
        const lines = buffer.split('\n')
        buffer = lines.pop() || '' // Keep incomplete line in buffer

        for (const line of lines) {
          const trimmed = line.trim()

          if (!trimmed || trimmed.startsWith(':')) {
            continue // Skip empty lines and comments
          }

          if (trimmed === 'data: [DONE]') {
            return
          }

          if (trimmed.startsWith('data: ')) {
            const jsonStr = trimmed.slice(6)
            try {
              const chunk = JSON.parse(jsonStr) as ChatCompletionChunk
              yield chunk
            } catch {
              console.warn('Failed to parse SSE chunk:', jsonStr)
            }
          }
        }
      }
    } finally {
      reader.releaseLock()
      this.abortController = null
    }
  }

  /** Cancel any ongoing stream */
  cancelStream(): void {
    this.abortController?.abort()
    this.abortController = null
  }
}

// Singleton instance
export const lmStudioClient = new LMStudioClient()
