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

ipcMain.handle('schema:columns', async (_event, connectionId: string, table: string, schema?: string) => {
  const driver = connectionManager.getDriver(connectionId)
  if (!driver) throw new Error(`Not connected to '${connectionId}'`)
  return driver.getColumns(table, schema)
})

ipcMain.handle('schema:indexes', async (_event, connectionId: string, table: string, schema: string) => {
  const driver = connectionManager.getDriver(connectionId)
  if (!driver) throw new Error(`Not connected to '${connectionId}'`)
  return driver.getIndexes(table, schema)
})

ipcMain.handle('schema:triggers', async (_event, connectionId: string, table: string, schema: string) => {
  const driver = connectionManager.getDriver(connectionId)
  if (!driver) throw new Error(`Not connected to '${connectionId}'`)
  return driver.getTriggers(table, schema)
})

ipcMain.handle('schema:functions', async (_event, connectionId: string, schema: string) => {
  const driver = connectionManager.getDriver(connectionId)
  if (!driver) throw new Error(`Not connected to '${connectionId}'`)
  return driver.getFunctions(schema)
})

ipcMain.handle('schema:relationships', async (_event, connectionId: string, schema: string) => {
  const driver = connectionManager.getDriver(connectionId)
  if (!driver) throw new Error(`Not connected to '${connectionId}'`)
  return driver.getRelationships(schema)
})
