import { memo, useCallback } from 'react'
import clsx from 'clsx'
import { useConversations, useChat } from '../../hooks'
import { useChatStore } from '../../stores'
import { getMessages, getConversation } from '../../lib/db'
import { IconButton, PlusIcon, SearchIcon, XIcon } from '../ui'
import { ConversationItem } from './ConversationItem'

export const Sidebar = memo(function Sidebar() {
  const sidebarOpen = useChatStore((s) => s.sidebarOpen)
  const setSidebarOpen = useChatStore((s) => s.setSidebarOpen)

  const { activeConversation, setActiveConversation, setMessages } = useChat()
  const {
    conversations,
    searchQuery,
    search,
    clearSearch,
    removeConversation,
    isSearching,
  } = useConversations()

  const handleSelectConversation = useCallback(
    async (conversationId: string) => {
      const conversation = await getConversation(conversationId)
      if (conversation) {
        setActiveConversation(conversation)
        const messages = await getMessages(conversationId)
        setMessages(messages)
      }
      // Close sidebar on mobile
      if (window.innerWidth < 640) {
        setSidebarOpen(false)
      }
    },
    [setActiveConversation, setMessages, setSidebarOpen]
  )

  const handleNewChat = useCallback(() => {
    setActiveConversation(null)
    setMessages([])
    if (window.innerWidth < 640) {
      setSidebarOpen(false)
    }
  }, [setActiveConversation, setMessages, setSidebarOpen])

  const handleDeleteConversation = useCallback(
    async (id: string) => {
      await removeConversation(id)
      if (activeConversation?.id === id) {
        setActiveConversation(null)
        setMessages([])
      }
    },
    [activeConversation?.id, removeConversation, setActiveConversation, setMessages]
  )

  return (
    <>
      {/* Backdrop for mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 sm:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={clsx(
          'fixed sm:relative z-50 sm:z-0',
          'w-72 h-full bg-surface border-r border-border',
          'flex flex-col',
          'transition-transform duration-200 ease-in-out',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full sm:translate-x-0 sm:hidden'
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h2 className="font-semibold text-lg">Chats</h2>
          <div className="flex items-center gap-1">
            <IconButton
              icon={<PlusIcon className="w-5 h-5" />}
              label="New chat"
              onClick={handleNewChat}
            />
            <IconButton
              icon={<XIcon className="w-5 h-5" />}
              label="Close sidebar"
              onClick={() => setSidebarOpen(false)}
              className="sm:hidden"
            />
          </div>
        </div>

        {/* Search */}
        <div className="px-3 py-2">
          <div className="relative">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => search(e.target.value)}
              placeholder="Search conversations..."
              className={clsx(
                'w-full pl-9 pr-8 py-2 text-sm',
                'bg-surface-secondary border border-border rounded-lg',
                'placeholder-text-tertiary text-text',
                'focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/20'
              )}
            />
            {isSearching && (
              <button
                onClick={clearSearch}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-text-tertiary hover:text-text"
              >
                <XIcon className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {/* Conversation list */}
        <div className="flex-1 overflow-y-auto px-2 py-1">
          {conversations.length === 0 ? (
            <div className="text-center py-8 text-text-secondary text-sm">
              {isSearching ? 'No conversations found' : 'No conversations yet'}
            </div>
          ) : (
            <div className="space-y-1">
              {conversations.map((conversation) => (
                <ConversationItem
                  key={conversation.id}
                  conversation={conversation}
                  isActive={activeConversation?.id === conversation.id}
                  onSelect={() => handleSelectConversation(conversation.id)}
                  onDelete={() => handleDeleteConversation(conversation.id)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-border">
          <p className="text-2xs text-text-tertiary text-center">
            {conversations.length} conversation{conversations.length !== 1 ? 's' : ''}
          </p>
        </div>
      </aside>
    </>
  )
})
