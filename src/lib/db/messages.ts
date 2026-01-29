import { db, generateId } from './schema'
import type { Message, Role } from '../../types/message'
import { updateConversationAfterMessage } from './conversations'

/** Create a new message */
export async function createMessage(
  conversationId: string,
  role: Role,
  content: string,
  options: Partial<Message> = {}
): Promise<Message> {
  const message: Message = {
    id: generateId(),
    conversationId,
    role,
    content,
    createdAt: Date.now(),
    ...options,
  }

  await db.messages.add(message)
  await updateConversationAfterMessage(conversationId, message)

  return message
}

/** Get all messages for a conversation */
export async function getMessages(conversationId: string): Promise<Message[]> {
  return db.messages
    .where('conversationId')
    .equals(conversationId)
    .sortBy('createdAt')
}

/** Get a single message by ID */
export async function getMessage(id: string): Promise<Message | undefined> {
  return db.messages.get(id)
}

/** Update a message (for streaming updates) */
export async function updateMessage(
  id: string,
  updates: Partial<Message>
): Promise<void> {
  await db.messages.update(id, updates)
}

/** Delete a message */
export async function deleteMessage(id: string): Promise<void> {
  await db.messages.delete(id)
}

/** Get the last N messages for context */
export async function getRecentMessages(
  conversationId: string,
  limit = 20
): Promise<Message[]> {
  const messages = await db.messages
    .where('conversationId')
    .equals(conversationId)
    .reverse()
    .limit(limit)
    .toArray()

  return messages.reverse() // Return in chronological order
}

/** Count messages in a conversation */
export async function countMessages(conversationId: string): Promise<number> {
  return db.messages.where('conversationId').equals(conversationId).count()
}

/** Search messages by content */
export async function searchMessages(
  query: string,
  conversationId?: string
): Promise<Message[]> {
  const lowerQuery = query.toLowerCase()

  let collection = db.messages.toCollection()
  if (conversationId) {
    collection = db.messages.where('conversationId').equals(conversationId)
  }

  return collection
    .filter((msg) => msg.content.toLowerCase().includes(lowerQuery))
    .limit(50)
    .toArray()
}
