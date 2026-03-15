import { create } from 'zustand'

interface UIState {
  sidebarWidth: number
  resultsHeight: number
  setSidebarWidth: (w: number) => void
  setResultsHeight: (h: number) => void
}

export const useUIStore = create<UIState>((set) => ({
  sidebarWidth: 260,
  resultsHeight: 280,
  setSidebarWidth: (sidebarWidth) => set({ sidebarWidth }),
  setResultsHeight: (resultsHeight) => set({ resultsHeight }),
}))
