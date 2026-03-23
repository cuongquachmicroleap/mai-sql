import { ipcMain } from 'electron'
import { chatWithAI, testAIKey } from '../managers/ai-manager'
import type { AIProviderConfig, AIRequest } from '../../shared/types/ai'

ipcMain.handle(
  'ai:chat',
  async (_event, config: AIProviderConfig, request: AIRequest) => {
    return chatWithAI(config, request)
  },
)

ipcMain.handle('ai:test-key', async (_event, config: AIProviderConfig) => {
  return testAIKey(config)
})
