import { ipcMain } from 'electron'
import { historyManager } from '../managers/history-manager'

ipcMain.handle('history:list', async (_event, connectionId?: string, limit?: number) => {
  return historyManager.list(connectionId, limit)
})

ipcMain.handle('history:search', async (_event, query: string, connectionId?: string) => {
  return historyManager.search(query, connectionId)
})

ipcMain.handle('history:toggle-favorite', async (_event, id: string) => {
  historyManager.toggleFavorite(id)
})

ipcMain.handle('history:delete', async (_event, id: string) => {
  historyManager.delete(id)
})

ipcMain.handle('history:clear', async (_event, connectionId?: string) => {
  historyManager.clear(connectionId)
})
