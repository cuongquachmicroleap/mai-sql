import { contextBridge, ipcRenderer } from 'electron'
import type { IPCChannels } from '@shared/types/ipc'

// Type-safe IPC invoker exposed to renderer via window.api
const api: IPCChannels = {
  // Connections
  'connection:list': () => ipcRenderer.invoke('connection:list'),
  'connection:save': (config) => ipcRenderer.invoke('connection:save', config),
  'connection:delete': (id) => ipcRenderer.invoke('connection:delete', id),
  'connection:test': (config) => ipcRenderer.invoke('connection:test', config),
  'connection:connect': (id) => ipcRenderer.invoke('connection:connect', id),
  'connection:disconnect': (id) => ipcRenderer.invoke('connection:disconnect', id),

  // Queries
  'query:execute': (connectionId, sql, database) => ipcRenderer.invoke('query:execute', connectionId, sql, database),
  'query:cancel': (queryId) => ipcRenderer.invoke('query:cancel', queryId),

  // Schema
  'schema:databases': (connectionId) => ipcRenderer.invoke('schema:databases', connectionId),
  'schema:default-database': (connectionId) => ipcRenderer.invoke('schema:default-database', connectionId),
  'schema:schemas': (connectionId, database) => ipcRenderer.invoke('schema:schemas', connectionId, database),
  'schema:tables': (connectionId, schema, database) => ipcRenderer.invoke('schema:tables', connectionId, schema, database),
  'schema:columns': (connectionId, table, schema, database) => ipcRenderer.invoke('schema:columns', connectionId, table, schema, database),
  'schema:indexes': (connectionId, table, schema, database) => ipcRenderer.invoke('schema:indexes', connectionId, table, schema, database),
  'schema:triggers': (connectionId, table, schema, database) => ipcRenderer.invoke('schema:triggers', connectionId, table, schema, database),
  'schema:functions': (connectionId, schema, database) => ipcRenderer.invoke('schema:functions', connectionId, schema, database),
  'schema:relationships': (connectionId, schema, database) => ipcRenderer.invoke('schema:relationships', connectionId, schema, database),

  // Backup / Restore
  'backup:export': (connectionId, database, tables, outputPath) => ipcRenderer.invoke('backup:export', connectionId, database, tables, outputPath),
  'backup:import': (connectionId, database, filePath) => ipcRenderer.invoke('backup:import', connectionId, database, filePath),
  'backup:choose-save-path': (defaultName) => ipcRenderer.invoke('backup:choose-save-path', defaultName),
  'backup:choose-open-path': () => ipcRenderer.invoke('backup:choose-open-path'),

  // AI
  'ai:chat': (config, request) => ipcRenderer.invoke('ai:chat', config, request),
  'ai:test-key': (config) => ipcRenderer.invoke('ai:test-key', config),

  // History
  'history:list': (connectionId, limit) => ipcRenderer.invoke('history:list', connectionId, limit),
  'history:search': (query, connectionId) => ipcRenderer.invoke('history:search', query, connectionId),
  'history:toggle-favorite': (id) => ipcRenderer.invoke('history:toggle-favorite', id),
  'history:delete': (id) => ipcRenderer.invoke('history:delete', id),
  'history:clear': (connectionId) => ipcRenderer.invoke('history:clear', connectionId),

  // Export
  'export:csv': (data, filePath) => ipcRenderer.invoke('export:csv', data, filePath),
  'export:xlsx': (data, filePath) => ipcRenderer.invoke('export:xlsx', data, filePath),
  'export:sql-insert': (tableName, data, filePath) => ipcRenderer.invoke('export:sql-insert', tableName, data, filePath),
  'export:choose-save-path': (defaultName, filters) => ipcRenderer.invoke('export:choose-save-path', defaultName, filters),

  // Snippets
  'snippet:list': () => ipcRenderer.invoke('snippet:list'),
  'snippet:save': (snippet) => ipcRenderer.invoke('snippet:save', snippet),
  'snippet:delete': (id) => ipcRenderer.invoke('snippet:delete', id),

  // Settings
  'settings:get': (key) => ipcRenderer.invoke('settings:get', key),
  'settings:set': (key, value) => ipcRenderer.invoke('settings:set', key, value),

  // SSH Tunnel
  'ssh:connect': (connectionId, tunnelConfig, remoteHost, remotePort) => ipcRenderer.invoke('ssh:connect', connectionId, tunnelConfig, remoteHost, remotePort),
  'ssh:disconnect': (connectionId) => ipcRenderer.invoke('ssh:disconnect', connectionId),

  // Schema Diff
  'diff:compare': (sourceConnectionId, targetConnectionId, sourceSchema, targetSchema, sourceDb, targetDb) => ipcRenderer.invoke('diff:compare', sourceConnectionId, targetConnectionId, sourceSchema, targetSchema, sourceDb, targetDb),
  'diff:generate-migration': (diff, sourceConnectionId, sourceSchema, sourceDb) => ipcRenderer.invoke('diff:generate-migration', diff, sourceConnectionId, sourceSchema, sourceDb),
}

contextBridge.exposeInMainWorld('api', api)

// TypeScript declaration for renderer — augments Window
declare global {
  interface Window {
    api: typeof api
  }
}
