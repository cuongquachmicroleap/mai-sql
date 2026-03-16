import { ipcMain } from 'electron'
import { settingsManager } from '../managers/settings-manager'

ipcMain.handle('settings:get', async (_event, key: string) => {
  return settingsManager.get(key)
})

ipcMain.handle('settings:set', async (_event, key: string, value: unknown) => {
  settingsManager.set(key, value)
})
