import { ipcMain } from 'electron'
import { connectionManager } from '../managers/connection-manager'
import type { SchemaDiffResult, TableDiff, ColumnDiff } from '../../shared/types/diff'
import type { ColumnInfo, IndexInfo } from '../../shared/types/schema'

ipcMain.handle(
  'diff:compare',
  async (
    _event,
    sourceConnectionId: string,
    targetConnectionId: string,
    sourceSchema: string,
    targetSchema: string,
    sourceDb?: string,
    targetDb?: string
  ): Promise<SchemaDiffResult> => {
    const sourceDriver = connectionManager.getDriver(sourceConnectionId)
    if (!sourceDriver) throw new Error(`Not connected to '${sourceConnectionId}'`)

    const targetDriver = connectionManager.getDriver(targetConnectionId)
    if (!targetDriver) throw new Error(`Not connected to '${targetConnectionId}'`)

    const [sourceTables, targetTables] = await Promise.all([
      sourceDriver.getTables(sourceSchema, sourceDb),
      targetDriver.getTables(targetSchema, targetDb),
    ])

    const sourceTableNames = new Set(sourceTables.map((t) => t.name))
    const targetTableNames = new Set(targetTables.map((t) => t.name))

    const addedTables = Array.from(sourceTableNames).filter((n) => !targetTableNames.has(n))
    const removedTables = Array.from(targetTableNames).filter((n) => !sourceTableNames.has(n))

    const commonTables = Array.from(sourceTableNames).filter((n) => targetTableNames.has(n))
    const modifiedTables: TableDiff[] = []

    for (const tableName of commonTables) {
      const [sourceColumns, targetColumns, sourceIndexes, targetIndexes] = await Promise.all([
        sourceDriver.getColumns(tableName, sourceSchema, sourceDb),
        targetDriver.getColumns(tableName, targetSchema, targetDb),
        sourceDriver.getIndexes(tableName, sourceSchema, sourceDb),
        targetDriver.getIndexes(tableName, targetSchema, targetDb),
      ])

      const tableDiff = compareTable(tableName, sourceColumns, targetColumns, sourceIndexes, targetIndexes)
      if (tableDiff) modifiedTables.push(tableDiff)
    }

    return { addedTables, removedTables, modifiedTables }
  }
)

ipcMain.handle(
  'diff:generate-migration',
  async (
    _event,
    diff: SchemaDiffResult,
    sourceConnectionId: string,
    schema: string,
    database?: string
  ): Promise<string> => {
    const sourceDriver = connectionManager.getDriver(sourceConnectionId)
    if (!sourceDriver) throw new Error(`Not connected to '${sourceConnectionId}'`)

    const statements: string[] = []

    for (const tableName of diff.addedTables) {
      const columns = await sourceDriver.getColumns(tableName, schema, database)
      const indexes = await sourceDriver.getIndexes(tableName, schema, database)

      const colDefs = columns.map((col) => {
        let def = `  ${quoteIdent(col.name)} ${col.displayType}`
        if (!col.nullable) def += ' NOT NULL'
        if (col.defaultValue != null) def += ` DEFAULT ${col.defaultValue}`
        if (col.isPrimaryKey) def += ' PRIMARY KEY'
        return def
      })

      statements.push(`CREATE TABLE ${quoteIdent(tableName)} (\n${colDefs.join(',\n')}\n);`)

      for (const idx of indexes) {
        if (idx.isPrimary) continue
        const unique = idx.isUnique ? 'UNIQUE ' : ''
        const cols = idx.columns.map(quoteIdent).join(', ')
        statements.push(`CREATE ${unique}INDEX ${quoteIdent(idx.name)} ON ${quoteIdent(tableName)} (${cols});`)
      }
    }

    for (const tableName of diff.removedTables) {
      statements.push(`DROP TABLE ${quoteIdent(tableName)};`)
    }

    for (const table of diff.modifiedTables) {
      if (table.addedColumns.length > 0) {
        const columns = await sourceDriver.getColumns(table.tableName, schema, database)
        const colMap = new Map(columns.map((c) => [c.name, c]))

        for (const colName of table.addedColumns) {
          const col = colMap.get(colName)
          if (!col) continue
          let def = `${col.displayType}`
          if (!col.nullable) def += ' NOT NULL'
          if (col.defaultValue != null) def += ` DEFAULT ${col.defaultValue}`
          statements.push(`ALTER TABLE ${quoteIdent(table.tableName)} ADD COLUMN ${quoteIdent(colName)} ${def};`)
        }
      }

      for (const colName of table.removedColumns) {
        statements.push(`ALTER TABLE ${quoteIdent(table.tableName)} DROP COLUMN ${quoteIdent(colName)};`)
      }

      for (const colDiff of table.modifiedColumns) {
        for (const change of colDiff.changes) {
          statements.push(`-- ${table.tableName}.${colDiff.name}: ${change}\nALTER TABLE ${quoteIdent(table.tableName)} ALTER COLUMN ${quoteIdent(colDiff.name)} ${change};`)
        }
      }

      if (table.addedIndexes.length > 0) {
        const indexes = await sourceDriver.getIndexes(table.tableName, schema, database)
        const idxMap = new Map(indexes.map((i) => [i.name, i]))
        for (const idxName of table.addedIndexes) {
          const idx = idxMap.get(idxName)
          if (!idx) continue
          const unique = idx.isUnique ? 'UNIQUE ' : ''
          const cols = idx.columns.map(quoteIdent).join(', ')
          statements.push(`CREATE ${unique}INDEX ${quoteIdent(idxName)} ON ${quoteIdent(table.tableName)} (${cols});`)
        }
      }

      for (const idxName of table.removedIndexes) {
        statements.push(`DROP INDEX ${quoteIdent(idxName)};`)
      }
    }

    return statements.join('\n\n')
  }
)

function quoteIdent(name: string): string {
  return `"${name.replace(/"/g, '""')}"`
}

function compareTable(
  tableName: string,
  sourceColumns: ColumnInfo[],
  targetColumns: ColumnInfo[],
  sourceIndexes: IndexInfo[],
  targetIndexes: IndexInfo[]
): TableDiff | null {
  const sourceColNames = new Set(sourceColumns.map((c) => c.name))
  const targetColNames = new Set(targetColumns.map((c) => c.name))

  const addedColumns = Array.from(sourceColNames).filter((n) => !targetColNames.has(n))
  const removedColumns = Array.from(targetColNames).filter((n) => !sourceColNames.has(n))

  const commonCols = Array.from(sourceColNames).filter((n) => targetColNames.has(n))
  const sourceColMap = new Map(sourceColumns.map((c) => [c.name, c]))
  const targetColMap = new Map(targetColumns.map((c) => [c.name, c]))

  const modifiedColumns: ColumnDiff[] = []
  for (const colName of commonCols) {
    const src = sourceColMap.get(colName)!
    const tgt = targetColMap.get(colName)!
    const changes: string[] = []
    if (src.displayType !== tgt.displayType) changes.push(`TYPE ${src.displayType}`)
    if (src.nullable !== tgt.nullable) changes.push(src.nullable ? 'DROP NOT NULL' : 'SET NOT NULL')
    if (norm(src.defaultValue) !== norm(tgt.defaultValue)) {
      changes.push(src.defaultValue != null ? `SET DEFAULT ${src.defaultValue}` : 'DROP DEFAULT')
    }
    if (changes.length > 0) modifiedColumns.push({ name: colName, changes })
  }

  const sourceIdxNames = new Set(sourceIndexes.map((i) => i.name))
  const targetIdxNames = new Set(targetIndexes.map((i) => i.name))
  const addedIndexes = Array.from(sourceIdxNames).filter((n) => !targetIdxNames.has(n))
  const removedIndexes = Array.from(targetIdxNames).filter((n) => !sourceIdxNames.has(n))

  const hasChanges = addedColumns.length + removedColumns.length + modifiedColumns.length + addedIndexes.length + removedIndexes.length > 0
  if (!hasChanges) return null
  return { tableName, addedColumns, removedColumns, modifiedColumns, addedIndexes, removedIndexes }
}

function norm(v: string | undefined | null): string {
  return v ?? ''
}
