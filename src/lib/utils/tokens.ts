/**
 * Rough token count estimation.
 * Uses the common heuristic of ~4 characters per token for English text.
 * This is not exact but good enough for UI display.
 */
export function estimateTokens(text: string): number {
  if (!text) return 0

  // Split on whitespace and count
  const words = text.trim().split(/\s+/).length

  // Rough estimate: 1 word ≈ 1.3 tokens on average
  // This accounts for subword tokenization
  return Math.ceil(words * 1.3)
}

/**
 * Estimate tokens for a messages array
 */
export function estimateMessagesTokens(
  messages: Array<{ role: string; content: string }>
): number {
  let total = 0

  for (const msg of messages) {
    // Add overhead for role tokens (~4 tokens per message for formatting)
    total += 4
    total += estimateTokens(msg.content)
  }

  return total
}

/**
 * Check if messages might exceed context window
 */
export function wouldExceedContext(
  messages: Array<{ role: string; content: string }>,
  maxTokens: number,
  buffer = 1000 // Leave room for response
): boolean {
  const estimated = estimateMessagesTokens(messages)
  return estimated > maxTokens - buffer
}

/**
 * Format token count for display
 */
export function formatTokenCount(count: number): string {
  if (count < 1000) return count.toString()
  return `${(count / 1000).toFixed(1)}k`
}
