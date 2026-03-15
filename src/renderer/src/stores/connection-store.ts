import { create } from 'zustand'
import { invoke } from '../lib/ipc-client'
import type { SavedConnection } from '@shared/types/connection'

interface ConnectionState {
  connections: SavedConnection[]
  activeConnectionId: string | null
  loading: boolean
  error: string | null

  loadConnections: () => Promise<void>
  connectTo: (id: string) => Promise<void>
  disconnectFrom: (id: string) => Promise<void>
  deleteConnection: (id: string) => Promise<void>
}

export const useConnectionStore = create<ConnectionState>((set, get) => ({
  connections: [],
  activeConnectionId: null,
  loading: false,
  error: null,

  loadConnections: async () => {
    set({ loading: true, error: null })
    try {
      const connections = await invoke('connection:list')
      set({ connections, loading: false })
    } catch (err) {
      set({ error: (err as Error).message, loading: false })
    }
  },

  connectTo: async (id: string) => {
    set({ loading: true, error: null })
    try {
      await invoke('connection:connect', id)
      set({ activeConnectionId: id, loading: false })
    } catch (err) {
      set({ error: (err as Error).message, loading: false })
    }
  },

  disconnectFrom: async (id: string) => {
    await invoke('connection:disconnect', id)
    const { activeConnectionId } = get()
    if (activeConnectionId === id) {
      set({ activeConnectionId: null })
    }
  },

  deleteConnection: async (id: string) => {
    await invoke('connection:delete', id)
    await get().loadConnections()
  },
}))
