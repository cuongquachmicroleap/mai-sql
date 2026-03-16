import { ipcMain } from 'electron'
import { connectionManager } from '../managers/connection-manager'
import { historyManager } from '../managers/history-manager'

ipcMain.handle('query:execute', async (_event, connectionId: string, sql: string, database?: string) => {
  const driver = connectionManager.getDriver(connectionId)
  if (!driver) throw new Error(`Not connected to '${connectionId}'. Call connection:connect first.`)

  // Look up the connection name for history recording
  const connections = connectionManager.listConnections()
  const connection = connections.find((c) => c.id === connectionId)
  const connectionName = connection?.name ?? connectionId

  const startTime = Date.now()
  try {
    const result = await driver.execute(sql, undefined, database)

    historyManager.add({
      connectionId,
      connectionName,
      database: database ?? connection?.database ?? '',
      sql,
      executedAt: new Date(startTime).toISOString(),
      executionTimeMs: result.executionTimeMs,
      rowCount: result.rowCount,
      status: 'success',
    })

    return result
  } catch (err) {
    const executionTimeMs = Date.now() - startTime

    historyManager.add({
      connectionId,
      connectionName,
      database: database ?? connection?.database ?? '',
      sql,
      executedAt: new Date(startTime).toISOString(),
      executionTimeMs,
      rowCount: 0,
      status: 'error',
      error: (err as Error).message,
    })

    throw err
  }
})

ipcMain.handle('query:cancel', async (_event, queryId: string) => {
  // Driver-level cancel — stub for Sprint 1
  console.log('[IPC] Cancel requested for query:', queryId)
})
