import { create } from 'zustand'
import { invoke } from '../lib/ipc-client'
import type { Snippet } from '@shared/types/snippet'

interface SnippetState {
  snippets: Snippet[]
  loading: boolean
  activeCategory: string | null

  loadSnippets: () => Promise<void>
  saveSnippet: (snippet: Snippet) => Promise<void>
  deleteSnippet: (id: string) => Promise<void>
  setActiveCategory: (category: string | null) => void
}

export const useSnippetStore = create<SnippetState>((set) => ({
  snippets: [],
  loading: false,
  activeCategory: null,

  loadSnippets: async () => {
    set({ loading: true })
    try {
      const snippets = await invoke('snippet:list')
      set({ snippets, loading: false })
    } catch {
      set({ loading: false })
    }
  },

  saveSnippet: async (snippet: Snippet) => {
    await invoke('snippet:save', snippet)
    set((state) => {
      const idx = state.snippets.findIndex((s) => s.id === snippet.id)
      if (idx >= 0) {
        const updated = [...state.snippets]
        updated[idx] = snippet
        return { snippets: updated }
      }
      return { snippets: [...state.snippets, snippet] }
    })
  },

  deleteSnippet: async (id: string) => {
    await invoke('snippet:delete', id)
    set((state) => ({ snippets: state.snippets.filter((s) => s.id !== id) }))
  },

  setActiveCategory: (activeCategory: string | null) => set({ activeCategory }),
}))
