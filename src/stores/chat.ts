import { create } from 'zustand'
import type { Message } from '../types/message'
import type { Conversation } from '../types/conversation'

interface ChatState {
  // Current conversation
  activeConversation: Conversation | null
  messages: Message[]

  // UI state
  isStreaming: boolean
  streamingMessageId: string | null
  inputValue: string
  sidebarOpen: boolean

  // Actions
  setActiveConversation: (conversation: Conversation | null) => void
  setMessages: (messages: Message[]) => void
  addMessage: (message: Message) => void
  updateMessage: (id: string, updates: Partial<Message>) => void
  removeMessage: (id: string) => void

  setIsStreaming: (isStreaming: boolean) => void
  setStreamingMessageId: (id: string | null) => void
  setInputValue: (value: string) => void
  toggleSidebar: () => void
  setSidebarOpen: (open: boolean) => void

  // Helpers
  clearChat: () => void
}

export const useChatStore = create<ChatState>((set) => ({
  activeConversation: null,
  messages: [],
  isStreaming: false,
  streamingMessageId: null,
  inputValue: '',
  sidebarOpen: true,

  setActiveConversation: (activeConversation) =>
    set({ activeConversation, messages: [] }),

  setMessages: (messages) => set({ messages }),

  addMessage: (message) =>
    set((state) => ({
      messages: [...state.messages, message],
    })),

  updateMessage: (id, updates) =>
    set((state) => ({
      messages: state.messages.map((msg) =>
        msg.id === id ? { ...msg, ...updates } : msg
      ),
    })),

  removeMessage: (id) =>
    set((state) => ({
      messages: state.messages.filter((msg) => msg.id !== id),
    })),

  setIsStreaming: (isStreaming) => set({ isStreaming }),

  setStreamingMessageId: (streamingMessageId) => set({ streamingMessageId }),

  setInputValue: (inputValue) => set({ inputValue }),

  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),

  setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),

  clearChat: () =>
    set({
      activeConversation: null,
      messages: [],
      isStreaming: false,
      streamingMessageId: null,
      inputValue: '',
    }),
}))
