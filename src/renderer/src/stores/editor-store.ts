import { create } from 'zustand'
import { nanoid } from 'nanoid'
import { invoke } from '../lib/ipc-client'
import type { QueryResult } from '@shared/types/query'

export interface Tab {
  id: string
  title: string
  content: string
  connectionId: string | null
  result: QueryResult | null
  error: string | null
  isExecuting: boolean
  rowLimit: number | null  // null = no limit (All)
  selectedText: string     // currently selected text in the editor
}

interface EditorState {
  tabs: Tab[]
  activeTabId: string | null

  addTab: () => void
  closeTab: (id: string) => void
  setActiveTab: (id: string) => void
  updateTabContent: (id: string, content: string) => void
  setRowLimit: (id: string, limit: number | null) => void
  setSelectedText: (id: string, selectedText: string) => void
  executeQuery: (tabId: string, connectionId: string, sql: string) => Promise<void>
}

function createTab(): Tab {
  return {
    id: nanoid(),
    title: 'New Query',
    content: '',
    connectionId: null,
    result: null,
    error: null,
    isExecuting: false,
    rowLimit: 100,
    selectedText: '',
  }
}

export const useEditorStore = create<EditorState>((set, _get) => {
  const initialTab = createTab()
  return {
    tabs: [initialTab],
    activeTabId: initialTab.id,

    addTab: () => {
      const tab = createTab()
      set((state) => ({ tabs: [...state.tabs, tab], activeTabId: tab.id }))
    },

    closeTab: (id: string) => {
      set((state) => {
        const tabs = state.tabs.filter((t) => t.id !== id)
        const remaining = tabs.length > 0 ? tabs : [createTab()]
        const activeTabId =
          state.activeTabId === id
            ? (remaining[remaining.length - 1]?.id ?? null)
            : state.activeTabId
        return { tabs: remaining, activeTabId }
      })
    },

    setActiveTab: (id: string) => set({ activeTabId: id }),

    updateTabContent: (id: string, content: string) => {
      set((state) => ({
        tabs: state.tabs.map((t) => (t.id === id ? { ...t, content } : t)),
      }))
    },

    setRowLimit: (id: string, limit: number | null) => {
      set((state) => ({
        tabs: state.tabs.map((t) => (t.id === id ? { ...t, rowLimit: limit } : t)),
      }))
    },

    setSelectedText: (id: string, selectedText: string) => {
      set((state) => ({
        tabs: state.tabs.map((t) => (t.id === id ? { ...t, selectedText } : t)),
      }))
    },

    executeQuery: async (tabId: string, connectionId: string, sql: string) => {
      set((state) => ({
        tabs: state.tabs.map((t) =>
          t.id === tabId ? { ...t, isExecuting: true, error: null, result: null } : t
        ),
      }))
      try {
        const result = await invoke('query:execute', connectionId, sql)
        set((state) => ({
          tabs: state.tabs.map((t) =>
            t.id === tabId ? { ...t, isExecuting: false, result, connectionId } : t
          ),
        }))
      } catch (err) {
        set((state) => ({
          tabs: state.tabs.map((t) =>
            t.id === tabId
              ? { ...t, isExecuting: false, error: (err as Error).message }
              : t
          ),
        }))
      }
    },
  }
})
