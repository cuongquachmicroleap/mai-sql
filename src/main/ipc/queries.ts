import { ipcMain } from 'electron'
import { connectionManager } from '../managers/connection-manager'

ipcMain.handle('query:execute', async (_event, connectionId: string, sql: string, database?: string) => {
  const driver = connectionManager.getDriver(connectionId)
  if (!driver) throw new Error(`Not connected to '${connectionId}'. Call connection:connect first.`)
  return driver.execute(sql, undefined, database)
})

ipcMain.handle('query:cancel', async (_event, queryId: string) => {
  // Driver-level cancel — stub for Sprint 1
  console.log('[IPC] Cancel requested for query:', queryId)
})
