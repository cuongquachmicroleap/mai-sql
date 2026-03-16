import { create } from 'zustand'
import { nanoid } from 'nanoid'
import { invoke } from '../lib/ipc-client'
import type { QueryResult } from '@shared/types/query'
import type { TableDesignerState } from '@shared/types/schema'

export interface Tab {
  id: string
  type: 'query' | 'table-designer' | 'mindmap'
  title: string
  content: string
  connectionId: string | null
  database?: string
  result: QueryResult | null
  error: string | null
  isExecuting: boolean
  rowLimit: number | null
  selectedText: string
  // Mindmap fields
  mindmapDatabase?: string
  mindmapSchema?: string
  // Table designer fields
  designerState?: TableDesignerState
  designerOriginalState?: TableDesignerState
  designerMode?: 'create' | 'alter'
}

interface EditorState {
  tabs: Tab[]
  activeTabId: string | null

  addTab: () => void
  addTabWithContent: (title: string, content: string, database?: string) => void
  closeTab: (id: string) => void
  setActiveTab: (id: string) => void
  updateTabContent: (id: string, content: string) => void
  setRowLimit: (id: string, limit: number | null) => void
  setSelectedText: (id: string, selectedText: string) => void
  executeQuery: (tabId: string, connectionId: string, sql: string) => Promise<void>
  openMindmap: (database?: string, schema?: string) => void
  openTableDesigner: (connectionId: string, schema: string, tableName?: string, database?: string) => Promise<void>
  updateDesignerState: (tabId: string, state: TableDesignerState) => void
}

function createTab(): Tab {
  return {
    id: nanoid(),
    type: 'query',
    title: 'New Query',
    content: '',
    connectionId: null,
    result: null,
    error: null,
    isExecuting: false,
    rowLimit: 100,
    selectedText: '',
  }
}

function createEmptyDesignerState(schema: string, database?: string): TableDesignerState {
  return {
    database,
    schema,
    tableName: '',
    columns: [],
    indexes: [],
    foreignKeys: [],
    enums: [],
  }
}

export const useEditorStore = create<EditorState>((set, _get) => {
  const initialTab = createTab()
  return {
    tabs: [initialTab],
    activeTabId: initialTab.id,

    addTab: () => {
      const tab = createTab()
      set((state) => ({ tabs: [...state.tabs, tab], activeTabId: tab.id }))
    },

    addTabWithContent: (title: string, content: string, database?: string) => {
      const tab: Tab = { ...createTab(), title, content, database }
      set((state) => ({ tabs: [...state.tabs, tab], activeTabId: tab.id }))
    },

    closeTab: (id: string) => {
      set((state) => {
        const tabs = state.tabs.filter((t) => t.id !== id)
        const remaining = tabs.length > 0 ? tabs : [createTab()]
        const activeTabId =
          state.activeTabId === id
            ? (remaining[remaining.length - 1]?.id ?? null)
            : state.activeTabId
        return { tabs: remaining, activeTabId }
      })
    },

    setActiveTab: (id: string) => set({ activeTabId: id }),

    updateTabContent: (id: string, content: string) => {
      set((state) => ({
        tabs: state.tabs.map((t) => (t.id === id ? { ...t, content } : t)),
      }))
    },

    setRowLimit: (id: string, limit: number | null) => {
      set((state) => ({
        tabs: state.tabs.map((t) => (t.id === id ? { ...t, rowLimit: limit } : t)),
      }))
    },

    setSelectedText: (id: string, selectedText: string) => {
      set((state) => ({
        tabs: state.tabs.map((t) => (t.id === id ? { ...t, selectedText } : t)),
      }))
    },

    executeQuery: async (tabId: string, connectionId: string, sql: string) => {
      set((state) => ({
        tabs: state.tabs.map((t) =>
          t.id === tabId ? { ...t, isExecuting: true, error: null, result: null } : t
        ),
      }))
      try {
        const tab = _get().tabs.find((t) => t.id === tabId)
        const result = await invoke('query:execute', connectionId, sql, tab?.database)
        set((state) => ({
          tabs: state.tabs.map((t) =>
            t.id === tabId ? { ...t, isExecuting: false, result, connectionId } : t
          ),
        }))
      } catch (err) {
        set((state) => ({
          tabs: state.tabs.map((t) =>
            t.id === tabId
              ? { ...t, isExecuting: false, error: (err as Error).message }
              : t
          ),
        }))
      }
    },

    openMindmap: (database?: string, schema?: string) => {
      const id = nanoid()
      const title = schema ? `Mindmap: ${database}/${schema}` : database ? `Mindmap: ${database}` : 'Mindmap'
      const tab: Tab = {
        ...createTab(),
        id,
        type: 'mindmap',
        title,
        mindmapDatabase: database,
        mindmapSchema: schema,
      }
      set((state) => ({ tabs: [...state.tabs, tab], activeTabId: id }))
    },

    openTableDesigner: async (connectionId: string, schema: string, tableName?: string, database?: string) => {
      const id = nanoid()
      const mode = tableName ? 'alter' : 'create'
      const title = tableName ? `Design: ${tableName}` : 'New Table'

      if (mode === 'alter' && tableName) {
        // Load existing table structure
        try {
          const [columns, indexes, relationships] = await Promise.all([
            invoke('schema:columns', connectionId, tableName, schema, database),
            invoke('schema:indexes', connectionId, tableName, schema, database),
            invoke('schema:relationships', connectionId, schema, database),
          ])

          const designerColumns = columns.map((col) => ({
            _tempId: nanoid(),
            name: col.name,
            type: col.displayType,
            nullable: col.nullable,
            defaultValue: col.defaultValue ?? '',
            isPrimaryKey: col.isPrimaryKey,
            comment: col.comment ?? '',
          }))

          const designerIndexes = indexes
            .filter((idx) => !idx.isPrimary)
            .map((idx) => ({
              _tempId: nanoid(),
              name: idx.name,
              columns: idx.columns,
              isUnique: idx.isUnique,
            }))

          const tableFKs = relationships.filter(
            (r) => r.sourceTable === tableName || r.sourceTable === `${schema}.${tableName}`
          )
          const fkGroups = new Map<string, typeof tableFKs>()
          for (const fk of tableFKs) {
            const group = fkGroups.get(fk.constraintName) ?? []
            group.push(fk)
            fkGroups.set(fk.constraintName, group)
          }
          const designerForeignKeys = Array.from(fkGroups.entries()).map(([name, fks]) => ({
            _tempId: nanoid(),
            constraintName: name,
            columns: fks.map((f) => f.sourceColumn),
            targetTable: fks[0].targetTable,
            targetColumns: fks.map((f) => f.targetColumn),
            onDelete: 'NO ACTION',
            onUpdate: 'NO ACTION',
          }))

          // Load enum types used by this table's columns
          const enumTypeNames = new Set(
            columns
              .filter((c) => c.type === 'USER-DEFINED')
              .map((c) => c.displayType)
          )
          const designerEnums: TableDesignerState['enums'] = []
          for (const enumName of enumTypeNames) {
            try {
              const enumResult = await invoke('query:execute', connectionId,
                `SELECT e.enumlabel FROM pg_enum e JOIN pg_type t ON e.enumtypid = t.oid JOIN pg_namespace n ON t.typnamespace = n.oid WHERE n.nspname = '${schema}' AND t.typname = '${enumName}' ORDER BY e.enumsortorder`)
              designerEnums.push({
                _tempId: nanoid(),
                name: enumName,
                values: enumResult.rows.map((r: Record<string, unknown>) => String(r['enumlabel'])),
              })
            } catch { /* ignore — enum may not be loadable */ }
          }

          const designerState: TableDesignerState = {
            database,
            schema,
            tableName,
            columns: designerColumns,
            indexes: designerIndexes,
            foreignKeys: designerForeignKeys,
            enums: designerEnums,
          }

          const tab: Tab = {
            id,
            type: 'table-designer',
            title,
            content: '',
            connectionId,
            result: null,
            error: null,
            isExecuting: false,
            rowLimit: null,
            selectedText: '',
            designerState,
            designerOriginalState: JSON.parse(JSON.stringify(designerState)),
            designerMode: 'alter',
          }
          set((state) => ({ tabs: [...state.tabs, tab], activeTabId: id }))
        } catch (err) {
          console.error('Failed to load table for designer:', err)
        }
      } else {
        const designerState = createEmptyDesignerState(schema, database)
        const tab: Tab = {
          id,
          type: 'table-designer',
          title,
          content: '',
          connectionId,
          result: null,
          error: null,
          isExecuting: false,
          rowLimit: null,
          selectedText: '',
          designerState,
          designerMode: 'create',
        }
        set((state) => ({ tabs: [...state.tabs, tab], activeTabId: id }))
      }
    },

    updateDesignerState: (tabId: string, designerState: TableDesignerState) => {
      set((state) => ({
        tabs: state.tabs.map((t) => (t.id === tabId ? { ...t, designerState } : t)),
      }))
    },
  }
})
