import { create } from 'zustand'
import { invoke } from '../lib/ipc-client'
import type { AIProviderConfig } from '@shared/types/ai'

export type Theme = 'dark' | 'light'

interface SettingsState {
  theme: Theme
  aiConfig: AIProviderConfig | null
  loaded: boolean

  loadSettings: () => Promise<void>
  setTheme: (theme: Theme) => Promise<void>
  setAIConfig: (config: AIProviderConfig) => Promise<void>
}

export const useSettingsStore = create<SettingsState>((set) => ({
  theme: 'dark',
  aiConfig: null,
  loaded: false,

  loadSettings: async () => {
    const theme = ((await invoke('settings:get', 'theme')) as Theme) || 'dark'
    const aiConfig = ((await invoke('settings:get', 'aiConfig')) as AIProviderConfig) || null
    set({ theme, aiConfig, loaded: true })
    document.documentElement.classList.toggle('light', theme === 'light')
  },

  setTheme: async (theme: Theme) => {
    await invoke('settings:set', 'theme', theme)
    document.documentElement.classList.toggle('light', theme === 'light')
    set({ theme })
  },

  setAIConfig: async (config: AIProviderConfig) => {
    await invoke('settings:set', 'aiConfig', config)
    set({ aiConfig: config })
  },
}))
