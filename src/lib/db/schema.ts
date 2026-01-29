import Dexie, { type Table } from 'dexie'
import type { Message } from '../../types/message'
import type { Conversation } from '../../types/conversation'

export type DBConversation = Conversation
export type DBMessage = Message

export class OmniAIDatabase extends Dexie {
  conversations!: Table<DBConversation, string>
  messages!: Table<DBMessage, string>

  constructor() {
    super('omniai')

    this.version(1).stores({
      conversations: 'id, createdAt, updatedAt, title',
      messages: 'id, conversationId, createdAt, role',
    })
  }
}

export const db = new OmniAIDatabase()

// Helper to generate IDs
export function generateId(): string {
  return crypto.randomUUID()
}
