export interface TableInfo {
  name: string
  schema: string
  type: 'table' | 'view' | 'materialized_view'
  rowCount?: number
  comment?: string
}

export interface ColumnInfo {
  name: string
  type: string           // base type, e.g. "character varying"
  displayType: string    // formatted type with length, e.g. "varchar(255)"
  nullable: boolean
  defaultValue?: string
  isPrimaryKey: boolean
  isForeignKey: boolean
  comment?: string
  maxLength?: number     // character_maximum_length
  precision?: number     // numeric_precision
  scale?: number         // numeric_scale
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

export interface TriggerInfo {
  name: string
  event: string   // INSERT, UPDATE, DELETE
  timing: string  // BEFORE, AFTER, INSTEAD OF
  orientation: string // ROW, STATEMENT
}

export interface FunctionInfo {
  name: string
  returnType: string
  language: string
  kind: 'function' | 'procedure'
}

export interface SchemaContext {
  dialect: string
  tables: Array<{ table: TableInfo; columns: ColumnInfo[] }>
  relationships: Relationship[]
}

// ── Table Designer types ──

export interface TableDesignerColumn {
  _tempId: string
  name: string
  type: string
  nullable: boolean
  defaultValue: string
  isPrimaryKey: boolean
  comment: string
}

export interface TableDesignerIndex {
  _tempId: string
  name: string
  columns: string[]
  isUnique: boolean
}

export interface TableDesignerForeignKey {
  _tempId: string
  constraintName: string
  columns: string[]
  targetTable: string
  targetColumns: string[]
  onDelete: string
  onUpdate: string
}

export interface TableDesignerEnum {
  _tempId: string
  name: string
  values: string[]       // ordered list of enum labels
}

export interface TableDesignerState {
  schema: string
  tableName: string
  columns: TableDesignerColumn[]
  indexes: TableDesignerIndex[]
  foreignKeys: TableDesignerForeignKey[]
  enums: TableDesignerEnum[]
}
