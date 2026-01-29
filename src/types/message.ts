export type Role = 'user' | 'assistant' | 'system'

export interface Message {
  id: string
  conversationId: string
  role: Role
  content: string
  createdAt: number
  /** Token count (estimated) */
  tokens?: number
  /** For agent messages: the reasoning trace */
  thinking?: string
  /** For agent messages: tools that were called */
  toolCalls?: ToolCall[]
  /** Is this message still being streamed? */
  isStreaming?: boolean
  /** Did this message fail to complete? */
  error?: string
}

export interface ToolCall {
  id: string
  name: string
  input: string
  output?: string
  status: 'pending' | 'running' | 'completed' | 'error'
}

export interface StreamChunk {
  type: 'content' | 'thinking' | 'tool_call' | 'tool_result' | 'error' | 'done'
  content?: string
  toolCall?: ToolCall
  error?: string
  usage?: TokenUsage
}

export interface TokenUsage {
  promptTokens: number
  completionTokens: number
  totalTokens: number
}

export interface ChatRequest {
  messages: Array<{ role: Role; content: string }>
  model?: string
  temperature?: number
  maxTokens?: number
  stream?: boolean
}
