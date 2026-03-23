import type { ConnectionConfig, SavedConnection, SSHTunnelConfig } from './connection'
import type { QueryResult } from './query'
import type { TableInfo, ColumnInfo, Relationship, FunctionInfo, IndexInfo, TriggerInfo } from './schema'
import type { AIProviderConfig, AIRequest, AIResponse } from './ai'
import type { HistoryEntry } from './history'
import type { Snippet } from './snippet'
import type { SchemaDiffResult } from './diff'

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
  'schema:supports-schemas': (connectionId: string) => Promise<boolean>
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

  // AI
  'ai:chat': (config: AIProviderConfig, request: AIRequest) => Promise<AIResponse>
  'ai:test-key': (config: AIProviderConfig) => Promise<{ success: boolean; error?: string }>

  // History
  'history:list': (connectionId?: string, limit?: number) => Promise<HistoryEntry[]>
  'history:search': (query: string, connectionId?: string) => Promise<HistoryEntry[]>
  'history:toggle-favorite': (id: string) => Promise<void>
  'history:delete': (id: string) => Promise<void>
  'history:clear': (connectionId?: string) => Promise<void>

  // Export
  'export:csv': (data: { columns: string[]; rows: unknown[][] }, filePath: string) => Promise<void>
  'export:xlsx': (data: { columns: string[]; rows: unknown[][] }, filePath: string) => Promise<void>
  'export:sql-insert': (tableName: string, data: { columns: string[]; rows: unknown[][] }, filePath: string) => Promise<void>
  'export:choose-save-path': (defaultName: string, filters: { name: string; extensions: string[] }[]) => Promise<string | null>

  // Snippets
  'snippet:list': () => Promise<Snippet[]>
  'snippet:save': (snippet: Snippet) => Promise<void>
  'snippet:delete': (id: string) => Promise<void>

  // Settings
  'settings:get': (key: string) => Promise<unknown>
  'settings:set': (key: string, value: unknown) => Promise<void>

  // SSH Tunnel
  'ssh:connect': (connectionId: string, tunnelConfig: SSHTunnelConfig, remoteHost: string, remotePort: number) => Promise<{ localPort: number }>
  'ssh:disconnect': (connectionId: string) => Promise<void>

  // Schema Diff
  'diff:compare': (sourceConnectionId: string, targetConnectionId: string, sourceSchema: string, targetSchema: string, sourceDb?: string, targetDb?: string) => Promise<SchemaDiffResult>
  'diff:generate-migration': (diff: SchemaDiffResult, sourceConnectionId: string, sourceSchema: string, sourceDb?: string) => Promise<string>
}

// Helper to make IPC calls type-safe in the renderer
export type IPCInvoker = {
  [K in keyof IPCChannels]: IPCChannels[K]
}
