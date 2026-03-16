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
  'query:execute': (connectionId, sql) => ipcRenderer.invoke('query:execute', connectionId, sql),
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
}

contextBridge.exposeInMainWorld('api', api)

// TypeScript declaration for renderer — augments Window
declare global {
  interface Window {
    api: typeof api
  }
}
