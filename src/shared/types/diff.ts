export interface SchemaDiffResult {
  addedTables: string[]
  removedTables: string[]
  modifiedTables: TableDiff[]
}

export interface TableDiff {
  tableName: string
  addedColumns: string[]
  removedColumns: string[]
  modifiedColumns: ColumnDiff[]
  addedIndexes: string[]
  removedIndexes: string[]
}

export interface ColumnDiff {
  name: string
  changes: string[]
}
