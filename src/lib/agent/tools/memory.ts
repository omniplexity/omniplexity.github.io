/**
 * Memory tool for searching through conversation history.
 * Uses simple keyword matching for now.
 */

import { searchMessages, getAllConversations } from '../../db'

export interface MemorySearchResult {
  query: string
  results: Array<{
    conversationTitle: string
    content: string
    role: 'user' | 'assistant'
    timestamp: number
  }>
}

/**
 * Search through conversation history for relevant messages.
 */
export async function searchMemory(query: string): Promise<MemorySearchResult> {
  const messages = await searchMessages(query)
  const conversations = await getAllConversations()

  // Map conversation IDs to titles
  const conversationMap = new Map(conversations.map((c) => [c.id, c.title]))

  return {
    query,
    results: messages.slice(0, 10).map((msg) => ({
      conversationTitle: conversationMap.get(msg.conversationId) || 'Unknown',
      content: msg.content.slice(0, 200) + (msg.content.length > 200 ? '...' : ''),
      role: msg.role as 'user' | 'assistant',
      timestamp: msg.createdAt,
    })),
  }
}

/**
 * Format memory search results for the agent.
 */
export function formatMemoryResults(result: MemorySearchResult): string {
  if (result.results.length === 0) {
    return `No relevant memories found for: "${result.query}"`
  }

  const formatted = result.results
    .map((r, i) => {
      const date = new Date(r.timestamp).toLocaleDateString()
      return `${i + 1}. [${r.role}] in "${r.conversationTitle}" (${date}):\n   "${r.content}"`
    })
    .join('\n\n')

  return `Found ${result.results.length} relevant memories for "${result.query}":\n\n${formatted}`
}

/** Tool definition for LangChain */
export const memoryToolDefinition = {
  name: 'memory',
  description:
    'Search through past conversation history. Useful for recalling what was discussed previously or finding specific information from earlier chats.',
  execute: async (input: string): Promise<string> => {
    const result = await searchMemory(input)
    return formatMemoryResults(result)
  },
}
