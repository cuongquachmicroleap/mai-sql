import type { SQLDialect } from '../../shared/types/connection'
import type { QueryResult } from '../../shared/types/query'
import type { TableInfo, ColumnInfo, Relationship, IndexInfo, FunctionInfo, TriggerInfo } from '../../shared/types/schema'

export type { SQLDialect }

export interface IDataSource {
  // Lifecycle
  connect(): Promise<void>
  disconnect(): Promise<void>
  testConnection(): Promise<boolean>

  // Execution
  execute(query: string, params?: unknown[]): Promise<QueryResult>
  cancel(queryId: string): Promise<void>

  // Schema introspection
  getDatabases(): Promise<string[]>
  getSchemas(database: string): Promise<string[]>
  getTables(schema: string): Promise<TableInfo[]>
  getColumns(table: string, schema?: string): Promise<ColumnInfo[]>
  getFunctions(schema: string): Promise<FunctionInfo[]>
  getRelationships(schema: string): Promise<Relationship[]>
  getIndexes(table: string, schema?: string): Promise<IndexInfo[]>
  getTriggers(table: string, schema: string): Promise<TriggerInfo[]>

  // Metadata
  getDialect(): SQLDialect
  getVersion(): Promise<string>
}

// Thrown by all drivers on connection or query failure
export class DataSourceError extends Error {
  constructor(
    message: string,
    public readonly code?: string,
    public readonly cause?: unknown
  ) {
    super(message)
    this.name = 'DataSourceError'
  }
}
