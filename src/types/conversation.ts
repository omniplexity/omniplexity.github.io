export interface Conversation {
  id: string
  title: string
  createdAt: number
  updatedAt: number
  /** Model used for this conversation */
  model?: string
  /** System prompt override */
  systemPrompt?: string
  /** Whether agent mode is enabled */
  agentEnabled?: boolean
  /** Message count (for display) */
  messageCount: number
  /** Preview of last message */
  preview?: string
}

export interface ConversationWithMessages extends Conversation {
  messages: import('./message').Message[]
}
