export interface TableInfo {
  name: string
  schema: string
  type: 'table' | 'view' | 'materialized_view'
  rowCount?: number
  comment?: string
}

export interface ColumnInfo {
  name: string
  type: string
  nullable: boolean
  defaultValue?: string
  isPrimaryKey: boolean
  isForeignKey: boolean
  comment?: string
}

export interface Relationship {
  sourceTable: string
  sourceColumn: string
  targetTable: string
  targetColumn: string
  constraintName: string
}

export interface IndexInfo {
  name: string
  columns: string[]
  isUnique: boolean
  isPrimary: boolean
}

export interface SchemaContext {
  dialect: string
  tables: Array<{ table: TableInfo; columns: ColumnInfo[] }>
  relationships: Relationship[]
}
