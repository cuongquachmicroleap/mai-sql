import type { ConnectionConfig, SavedConnection } from './connection'
import type { QueryResult } from './query'
import type { TableInfo, ColumnInfo, Relationship } from './schema'

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
  'query:execute': (connectionId: string, sql: string) => Promise<QueryResult>
  'query:cancel': (queryId: string) => Promise<void>

  // Schema introspection
  'schema:databases': (connectionId: string) => Promise<string[]>
  'schema:schemas': (connectionId: string, database: string) => Promise<string[]>
  'schema:tables': (connectionId: string, schema: string) => Promise<TableInfo[]>
  'schema:columns': (connectionId: string, table: string) => Promise<ColumnInfo[]>
  'schema:relationships': (connectionId: string, schema: string) => Promise<Relationship[]>
}

// Helper to make IPC calls type-safe in the renderer
export type IPCInvoker = {
  [K in keyof IPCChannels]: IPCChannels[K]
}
