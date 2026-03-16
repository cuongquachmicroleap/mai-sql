import { create } from 'zustand'
import { invoke } from '../lib/ipc-client'
import type { HistoryEntry } from '@shared/types/history'

interface HistoryState {
  entries: HistoryEntry[]
  loading: boolean
  searchQuery: string

  loadHistory: (connectionId?: string) => Promise<void>
  search: (query: string, connectionId?: string) => Promise<void>
  toggleFavorite: (id: string) => Promise<void>
  deleteEntry: (id: string) => Promise<void>
  clearHistory: (connectionId?: string) => Promise<void>
  setSearchQuery: (query: string) => void
}

export const useHistoryStore = create<HistoryState>((set, get) => ({
  entries: [],
  loading: false,
  searchQuery: '',

  loadHistory: async (connectionId?: string) => {
    set({ loading: true })
    try {
      const entries = await invoke('history:list', connectionId, 200)
      set({ entries, loading: false })
    } catch {
      set({ loading: false })
    }
  },

  search: async (query: string, connectionId?: string) => {
    set({ loading: true, searchQuery: query })
    try {
      const entries = query.trim()
        ? await invoke('history:search', query, connectionId)
        : await invoke('history:list', connectionId, 200)
      set({ entries, loading: false })
    } catch {
      set({ loading: false })
    }
  },

  toggleFavorite: async (id: string) => {
    await invoke('history:toggle-favorite', id)
    set((state) => ({
      entries: state.entries.map((e) =>
        e.id === id ? { ...e, isFavorite: !e.isFavorite } : e
      ),
    }))
  },

  deleteEntry: async (id: string) => {
    await invoke('history:delete', id)
    set((state) => ({ entries: state.entries.filter((e) => e.id !== id) }))
  },

  clearHistory: async (connectionId?: string) => {
    await invoke('history:clear', connectionId)
    const { entries } = get()
    set({
      entries: entries.filter((e) => e.isFavorite),
    })
  },

  setSearchQuery: (searchQuery: string) => set({ searchQuery }),
}))
