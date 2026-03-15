import { ipcMain } from 'electron'
import { connectionManager } from '../managers/connection-manager'

ipcMain.handle('schema:databases', async (_event, connectionId: string) => {
  const driver = connectionManager.getDriver(connectionId)
  if (!driver) throw new Error(`Not connected to '${connectionId}'`)
  return driver.getDatabases()
})

ipcMain.handle('schema:schemas', async (_event, connectionId: string, database: string) => {
  const driver = connectionManager.getDriver(connectionId)
  if (!driver) throw new Error(`Not connected to '${connectionId}'`)
  return driver.getSchemas(database)
})

ipcMain.handle('schema:tables', async (_event, connectionId: string, schema: string) => {
  const driver = connectionManager.getDriver(connectionId)
  if (!driver) throw new Error(`Not connected to '${connectionId}'`)
  return driver.getTables(schema)
})

ipcMain.handle('schema:columns', async (_event, connectionId: string, table: string) => {
  const driver = connectionManager.getDriver(connectionId)
  if (!driver) throw new Error(`Not connected to '${connectionId}'`)
  return driver.getColumns(table)
})

ipcMain.handle('schema:relationships', async (_event, connectionId: string, schema: string) => {
  const driver = connectionManager.getDriver(connectionId)
  if (!driver) throw new Error(`Not connected to '${connectionId}'`)
  return driver.getRelationships(schema)
})
