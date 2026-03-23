import { ipcMain, dialog } from 'electron'
import fs from 'fs'
import XLSX from 'xlsx'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function escapeCsvField(value: unknown): string {
  if (value === null || value === undefined) return ''

  const str = String(value)

  // Wrap in quotes if the value contains commas, quotes, or newlines
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`
  }

  return str
}

function escapeSqlValue(value: unknown): string {
  if (value === null || value === undefined) return 'NULL'
  if (typeof value === 'number' || typeof value === 'bigint') return String(value)
  if (typeof value === 'boolean') return value ? 'TRUE' : 'FALSE'

  const str = String(value)
  return `'${str.replace(/'/g, "''")}'`
}

// ---------------------------------------------------------------------------
// Choose save path
// ---------------------------------------------------------------------------

ipcMain.handle(
  'export:choose-save-path',
  async (
    _event,
    defaultName: string,
    filters: { name: string; extensions: string[] }[],
  ) => {
    const result = await dialog.showSaveDialog({
      title: 'Export Data',
      defaultPath: defaultName,
      filters,
    })
    return result.canceled ? null : result.filePath ?? null
  },
)

// ---------------------------------------------------------------------------
// CSV Export
// ---------------------------------------------------------------------------

ipcMain.handle(
  'export:csv',
  async (
    _event,
    data: { columns: string[]; rows: unknown[][] },
    filePath: string,
  ) => {
    const lines: string[] = []

    // Header row
    lines.push(data.columns.map(escapeCsvField).join(','))

    // Data rows
    for (const row of data.rows) {
      lines.push(row.map(escapeCsvField).join(','))
    }

    fs.writeFileSync(filePath, lines.join('\n'), 'utf-8')
  },
)

// ---------------------------------------------------------------------------
// XLSX Export
// ---------------------------------------------------------------------------

ipcMain.handle(
  'export:xlsx',
  async (
    _event,
    data: { columns: string[]; rows: unknown[][] },
    filePath: string,
  ) => {
    const aoa: unknown[][] = [data.columns, ...data.rows]
    const worksheet = XLSX.utils.aoa_to_sheet(aoa)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1')
    XLSX.writeFile(workbook, filePath)
  },
)

// ---------------------------------------------------------------------------
// SQL INSERT Export
// ---------------------------------------------------------------------------

ipcMain.handle(
  'export:sql-insert',
  async (
    _event,
    tableName: string,
    data: { columns: string[]; rows: unknown[][] },
    filePath: string,
  ) => {
    const columnList = data.columns.map((c) => `"${c}"`).join(', ')
    const statements: string[] = []
    const BATCH_SIZE = 100

    for (let i = 0; i < data.rows.length; i += BATCH_SIZE) {
      const batch = data.rows.slice(i, i + BATCH_SIZE)
      const valuesClauses = batch.map((row) => {
        const values = row.map(escapeSqlValue).join(', ')
        return `  (${values})`
      })

      statements.push(
        `INSERT INTO "${tableName}" (${columnList}) VALUES\n${valuesClauses.join(',\n')};`,
      )
    }

    fs.writeFileSync(filePath, statements.join('\n\n'), 'utf-8')
  },
)
