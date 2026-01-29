/** LM Studio OpenAI-compatible API types */

export interface LMStudioConfig {
  baseUrl: string
  timeout: number
}

export interface ChatCompletionRequest {
  model: string
  messages: ChatMessage[]
  temperature?: number
  max_tokens?: number
  top_p?: number
  stream?: boolean
  stop?: string[]
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface ChatCompletionResponse {
  id: string
  object: 'chat.completion'
  created: number
  model: string
  choices: ChatCompletionChoice[]
  usage?: Usage
}

export interface ChatCompletionChoice {
  index: number
  message: ChatMessage
  finish_reason: 'stop' | 'length' | 'tool_calls' | null
}

export interface ChatCompletionChunk {
  id: string
  object: 'chat.completion.chunk'
  created: number
  model: string
  choices: ChatCompletionChunkChoice[]
  usage?: Usage
}

export interface ChatCompletionChunkChoice {
  index: number
  delta: Partial<ChatMessage>
  finish_reason: 'stop' | 'length' | 'tool_calls' | null
}

export interface Usage {
  prompt_tokens: number
  completion_tokens: number
  total_tokens: number
}

export interface ModelListResponse {
  object: 'list'
  data: ModelObject[]
}

export interface ModelObject {
  id: string
  object: 'model'
  created?: number
  owned_by?: string
}

export interface LMStudioError {
  error: {
    message: string
    type: string
    code?: string
  }
}
