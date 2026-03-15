import { ipcMain } from 'electron'
import { connectionManager } from '../managers/connection-manager'
import type { ConnectionConfig } from '../../shared/types/connection'

ipcMain.handle('connection:list', async () => {
  return connectionManager.listConnections()
})

ipcMain.handle('connection:save', async (_event, config: ConnectionConfig) => {
  await connectionManager.saveConnection(config)
})

ipcMain.handle('connection:delete', async (_event, id: string) => {
  await connectionManager.deleteConnection(id)
})

ipcMain.handle('connection:test', async (_event, config: ConnectionConfig) => {
  return connectionManager.testConnection(config)
})

ipcMain.handle('connection:connect', async (_event, id: string) => {
  await connectionManager.connect(id)
})

ipcMain.handle('connection:disconnect', async (_event, id: string) => {
  await connectionManager.disconnect(id)
})
