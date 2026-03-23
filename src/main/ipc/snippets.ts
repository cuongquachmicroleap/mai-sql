import { ipcMain } from 'electron'
import { snippetManager } from '../managers/snippet-manager'
import type { Snippet } from '../../shared/types/snippet'

ipcMain.handle('snippet:list', async () => {
  return snippetManager.list()
})

ipcMain.handle('snippet:save', async (_event, snippet: Snippet) => {
  snippetManager.save(snippet)
})

ipcMain.handle('snippet:delete', async (_event, id: string) => {
  snippetManager.delete(id)
})
