export interface ColumnMeta {
  name: string
  dataType: string
  nullable?: boolean
}

export interface QueryResult {
  columns: ColumnMeta[]
  rows: Record<string, unknown>[]
  rowCount: number
  affectedRows?: number
  executionTimeMs: number
  warnings?: string[]
  queryId: string
}

export interface QueryError {
  message: string
  code?: string
  line?: number
  position?: number
}
