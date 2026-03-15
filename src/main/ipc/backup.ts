import { ipcMain, dialog } from 'electron'
import fs from 'fs'
import { connectionManager } from '../managers/connection-manager'

interface BackupColumn {
  name: string
  type: string
}

interface BackupTable {
  name: string
  columns: BackupColumn[]
  rows: unknown[][]
}

interface BackupFile {
  version: number
  database: string
  timestamp: string
  tables: BackupTable[]
}

ipcMain.handle('backup:choose-save-path', async (_event, defaultName: string) => {
  const result = await dialog.showSaveDialog({
    title: 'Save Backup File',
    defaultPath: defaultName,
    filters: [{ name: 'JSON Backup', extensions: ['json'] }],
  })
  return result.canceled ? null : result.filePath ?? null
})

ipcMain.handle('backup:choose-open-path', async () => {
  const result = await dialog.showOpenDialog({
    title: 'Open Backup File',
    filters: [{ name: 'JSON Backup', extensions: ['json'] }],
    properties: ['openFile'],
  })
  return result.canceled || result.filePaths.length === 0 ? null : result.filePaths[0]
})

ipcMain.handle(
  'backup:export',
  async (
    _event,
    connectionId: string,
    database: string,
    tables: string[],
    outputPath: string,
  ) => {
    try {
      const driver = connectionManager.getDriver(connectionId)
      if (!driver) {
        return { success: false, rowCount: 0, error: `Not connected to '${connectionId}'` }
      }

      const backupTables: BackupTable[] = []
      let totalRowCount = 0

      for (const tableName of tables) {
        // Quote table name to handle reserved words / special chars
        const result = await driver.execute(`SELECT * FROM "${tableName}"`)
        const columns: BackupColumn[] = result.columns.map((col) => ({
          name: col.name,
          type: col.dataType,
        }))

        const rows: unknown[][] = result.rows.map((row) =>
          result.columns.map((col) => row[col.name] ?? null),
        )

        backupTables.push({ name: tableName, columns, rows })
        totalRowCount += rows.length
      }

      const backup: BackupFile = {
        version: 1,
        database,
        timestamp: new Date().toISOString(),
        tables: backupTables,
      }

      fs.writeFileSync(outputPath, JSON.stringify(backup, null, 2), 'utf-8')

      return { success: true, rowCount: totalRowCount }
    } catch (err) {
      return { success: false, rowCount: 0, error: (err as Error).message }
    }
  },
)

ipcMain.handle(
  'backup:import',
  async (_event, connectionId: string, _database: string, filePath: string) => {
    try {
      const driver = connectionManager.getDriver(connectionId)
      if (!driver) {
        return { success: false, tablesRestored: 0, error: `Not connected to '${connectionId}'` }
      }

      const raw = fs.readFileSync(filePath, 'utf-8')
      const backup: BackupFile = JSON.parse(raw)

      if (backup.version !== 1 || !Array.isArray(backup.tables)) {
        return { success: false, tablesRestored: 0, error: 'Invalid backup file format' }
      }

      let tablesRestored = 0

      for (const table of backup.tables) {
        if (!Array.isArray(table.columns) || table.columns.length === 0) continue
        if (!Array.isArray(table.rows) || table.rows.length === 0) {
          tablesRestored++
          continue
        }

        const colNames = table.columns.map((c) => `"${c.name}"`).join(', ')
        const placeholders = table.columns.map(() => '?').join(', ')
        const insertSQL = `INSERT INTO "${table.name}" (${colNames}) VALUES (${placeholders})`

        for (const row of table.rows) {
          await driver.execute(insertSQL, row as unknown[])
        }

        tablesRestored++
      }

      return { success: true, tablesRestored }
    } catch (err) {
      return { success: false, tablesRestored: 0, error: (err as Error).message }
    }
  },
)
