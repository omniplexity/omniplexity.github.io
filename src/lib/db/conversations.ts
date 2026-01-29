import { db, generateId } from './schema'
import type { Conversation } from '../../types/conversation'
import type { Message } from '../../types/message'

/** Create a new conversation */
export async function createConversation(
  title = 'New Chat',
  model?: string
): Promise<Conversation> {
  const now = Date.now()
  const conversation: Conversation = {
    id: generateId(),
    title,
    createdAt: now,
    updatedAt: now,
    model,
    messageCount: 0,
  }

  await db.conversations.add(conversation)
  return conversation
}

/** Get a conversation by ID */
export async function getConversation(id: string): Promise<Conversation | undefined> {
  return db.conversations.get(id)
}

/** Get all conversations, sorted by most recent */
export async function getAllConversations(): Promise<Conversation[]> {
  return db.conversations.orderBy('updatedAt').reverse().toArray()
}

/** Update a conversation */
export async function updateConversation(
  id: string,
  updates: Partial<Conversation>
): Promise<void> {
  await db.conversations.update(id, {
    ...updates,
    updatedAt: Date.now(),
  })
}

/** Delete a conversation and all its messages */
export async function deleteConversation(id: string): Promise<void> {
  await db.transaction('rw', db.conversations, db.messages, async () => {
    await db.messages.where('conversationId').equals(id).delete()
    await db.conversations.delete(id)
  })
}

/** Update conversation metadata after adding a message */
export async function updateConversationAfterMessage(
  conversationId: string,
  message: Message
): Promise<void> {
  const conversation = await db.conversations.get(conversationId)
  if (!conversation) return

  const updates: Partial<Conversation> = {
    updatedAt: Date.now(),
    messageCount: conversation.messageCount + 1,
    preview: message.content.slice(0, 100),
  }

  // Auto-generate title from first user message if still default
  if (
    conversation.title === 'New Chat' &&
    message.role === 'user' &&
    conversation.messageCount === 0
  ) {
    updates.title = generateTitleFromMessage(message.content)
  }

  await db.conversations.update(conversationId, updates)
}

/** Generate a conversation title from the first message */
function generateTitleFromMessage(content: string): string {
  // Take first sentence or first 50 chars
  const firstSentence = content.split(/[.!?]/)[0] || content
  const title = firstSentence.trim().slice(0, 50)
  return title.length < firstSentence.length ? `${title}...` : title
}

/** Search conversations by title or preview */
export async function searchConversations(query: string): Promise<Conversation[]> {
  const lowerQuery = query.toLowerCase()
  return db.conversations
    .filter(
      (conv) =>
        conv.title.toLowerCase().includes(lowerQuery) ||
        (conv.preview?.toLowerCase().includes(lowerQuery) ?? false)
    )
    .toArray()
}

/** Clear all conversations and messages */
export async function clearAllData(): Promise<void> {
  await db.transaction('rw', db.conversations, db.messages, async () => {
    await db.messages.clear()
    await db.conversations.clear()
  })
}
