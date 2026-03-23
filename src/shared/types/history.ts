export interface HistoryEntry {
  id: string
  connectionId: string
  connectionName: string
  database: string
  sql: string
  executedAt: string
  executionTimeMs: number
  rowCount: number
  status: 'success' | 'error'
  error?: string
  isFavorite: boolean
}
