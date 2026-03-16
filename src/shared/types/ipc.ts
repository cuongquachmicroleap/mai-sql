import type { ConnectionConfig, SavedConnection } from './connection'
import type { QueryResult } from './query'
import type { TableInfo, ColumnInfo, Relationship, FunctionInfo, IndexInfo, TriggerInfo } from './schema'

// All IPC channels are typed here. contextBridge enforces this at runtime.
export interface IPCChannels {
  // Connection management
  'connection:list': () => Promise<SavedConnection[]>
  'connection:save': (config: ConnectionConfig) => Promise<void>
  'connection:delete': (id: string) => Promise<void>
  'connection:test': (config: ConnectionConfig) => Promise<{ success: boolean; error?: string }>
  'connection:connect': (id: string) => Promise<void>
  'connection:disconnect': (id: string) => Promise<void>

  // Query execution
  'query:execute': (connectionId: string, sql: string, database?: string) => Promise<QueryResult>
  'query:cancel': (queryId: string) => Promise<void>

  // Schema introspection
  'schema:databases': (connectionId: string) => Promise<string[]>
  'schema:default-database': (connectionId: string) => Promise<string>
  'schema:schemas': (connectionId: string, database?: string) => Promise<string[]>
  'schema:tables': (connectionId: string, schema: string, database?: string) => Promise<TableInfo[]>
  'schema:columns': (connectionId: string, table: string, schema?: string, database?: string) => Promise<ColumnInfo[]>
  'schema:indexes': (connectionId: string, table: string, schema: string, database?: string) => Promise<IndexInfo[]>
  'schema:triggers': (connectionId: string, table: string, schema: string, database?: string) => Promise<TriggerInfo[]>
  'schema:functions': (connectionId: string, schema: string, database?: string) => Promise<FunctionInfo[]>
  'schema:relationships': (connectionId: string, schema: string, database?: string) => Promise<Relationship[]>

  // Backup / Restore
  'backup:export': (connectionId: string, database: string, tables: string[], outputPath: string) => Promise<{ success: boolean; rowCount: number; error?: string }>
  'backup:import': (connectionId: string, database: string, filePath: string) => Promise<{ success: boolean; tablesRestored: number; error?: string }>
  'backup:choose-save-path': (defaultName: string) => Promise<string | null>
  'backup:choose-open-path': () => Promise<string | null>
}

// Helper to make IPC calls type-safe in the renderer
export type IPCInvoker = {
  [K in keyof IPCChannels]: IPCChannels[K]
}
