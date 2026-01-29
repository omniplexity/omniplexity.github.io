import { useCallback, useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { getAllConversations, deleteConversation, searchConversations } from '../lib/db'
import type { Conversation } from '../types/conversation'

export function useConversations() {
  const [searchQuery, setSearchQuery] = useState('')

  // Live query that updates when DB changes
  const allConversations = useLiveQuery(
    () => getAllConversations(),
    [],
    [] as Conversation[]
  )

  // Filtered conversations based on search
  const [filteredConversations, setFilteredConversations] = useState<Conversation[]>([])

  // Update filtered list when search or conversations change
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredConversations(allConversations || [])
    } else {
      searchConversations(searchQuery).then(setFilteredConversations)
    }
  }, [searchQuery, allConversations])

  /** Delete a conversation */
  const removeConversation = useCallback(async (id: string) => {
    await deleteConversation(id)
  }, [])

  /** Search conversations */
  const search = useCallback((query: string) => {
    setSearchQuery(query)
  }, [])

  /** Clear search */
  const clearSearch = useCallback(() => {
    setSearchQuery('')
  }, [])

  return {
    conversations: filteredConversations,
    searchQuery,
    search,
    clearSearch,
    removeConversation,
    isSearching: searchQuery.trim().length > 0,
  }
}
