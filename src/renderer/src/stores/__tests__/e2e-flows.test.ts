/**
 * E2E Flow Tests — store-level integration
 *
 * Each describe block is a complete user journey from zero state through
 * to a verified outcome. All Electron IPC is mocked via the ipc-client
 * module so tests run in the vitest (node) environment without a DOM.
 *
 * Feature coverage:
 *   1. Connection lifecycle — create, connect, disconnect, delete
 *   2. Query execution — success, error, row-limit, selected-text
 *   3. Tab management  — open, close, switch, last-tab-guard
 *   4. Snippet CRUD    — save, edit, delete, category filter
 *   5. Query history   — load, search, favorite-toggle, clear
 *   6. Table designer  — open (create mode), open (alter mode), update state
 *   7. Mindmap tab     — open with / without schema
 *   8. Full end-to-end — connect → query → history appears → tab stays
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// ─── IPC mock (must be hoisted before store imports) ──────────────────────────

const { mockInvoke } = vi.hoisted(() => ({ mockInvoke: vi.fn() }))
vi.mock('../../lib/ipc-client', () => ({ invoke: mockInvoke }))
vi.mock('nanoid', () => {
  let n = 0
  return { nanoid: () => `id-${++n}` }
})

import { useConnectionStore } from '../connection-store'
import { useEditorStore } from '../editor-store'
import { useSnippetStore } from '../snippet-store'
import { useHistoryStore } from '../history-store'
import type { SavedConnection } from '@shared/types/connection'
import type { Snippet } from '@shared/types/snippet'
import type { HistoryEntry } from '@shared/types/history'

// ─── Shared fixtures ─────────────────────────────────────────────────────────

const PG_CONN: SavedConnection = {
  id: 'conn-pg',
  name: 'Local PG',
  type: 'postgresql',
  host: 'localhost',
  port: 5432,
  database: 'appdb',
  username: 'admin',
  createdAt: '2025-01-01',
}

const MYSQL_CONN: SavedConnection = {
  id: 'conn-mysql',
  name: 'Dev MySQL',
  type: 'mysql',
  host: '10.0.0.1',
  port: 3306,
  database: 'devdb',
  username: 'root',
  createdAt: '2025-01-02',
}

const QUERY_RESULT = {
  columns: [{ name: 'id', dataType: 'int4' }, { name: 'name', dataType: 'text' }],
  rows: [{ id: 1, name: 'Alice' }, { id: 2, name: 'Bob' }],
  rowCount: 2,
  executionTimeMs: 12,
}

// ─── Reset stores before each test ───────────────────────────────────────────

function resetStores() {
  vi.clearAllMocks()

  useConnectionStore.setState({
    connections: [],
    activeConnectionId: null,
    loading: false,
    error: null,
  })

  const initialTab = { id: 'tab-init', type: 'query' as const, title: 'New Query', content: '', connectionId: null, result: null, error: null, isExecuting: false, rowLimit: 100, selectedText: '' }
  useEditorStore.setState({ tabs: [initialTab], activeTabId: 'tab-init' })

  useSnippetStore.setState({ snippets: [], loading: false, activeCategory: null })

  useHistoryStore.setState({ entries: [], loading: false, searchQuery: '' })
}

// ─── 1. Connection lifecycle ──────────────────────────────────────────────────

describe('Feature: Connection lifecycle', () => {
  beforeEach(resetStores)

  it('loads saved connections on startup', async () => {
    mockInvoke.mockResolvedValueOnce([PG_CONN, MYSQL_CONN])

    await useConnectionStore.getState().loadConnections()

    const { connections, loading, error } = useConnectionStore.getState()
    expect(connections).toHaveLength(2)
    expect(connections[0].name).toBe('Local PG')
    expect(connections[1].name).toBe('Dev MySQL')
    expect(loading).toBe(false)
    expect(error).toBeNull()
    expect(mockInvoke).toHaveBeenCalledWith('connection:list')
  })

  it('shows loading state while connections are being fetched', async () => {
    let resolve!: (v: unknown) => void
    mockInvoke.mockReturnValueOnce(new Promise((r) => { resolve = r }))

    const p = useConnectionStore.getState().loadConnections()
    expect(useConnectionStore.getState().loading).toBe(true)
    resolve([PG_CONN])
    await p
    expect(useConnectionStore.getState().loading).toBe(false)
  })

  it('records error when connection list IPC fails', async () => {
    mockInvoke.mockRejectedValueOnce(new Error('keychain locked'))

    await useConnectionStore.getState().loadConnections()

    const { error, connections } = useConnectionStore.getState()
    expect(error).toBe('keychain locked')
    expect(connections).toHaveLength(0)
  })

  it('connects to a saved connection and sets it as active', async () => {
    useConnectionStore.setState({ connections: [PG_CONN] })
    mockInvoke.mockResolvedValueOnce(undefined) // connection:connect

    await useConnectionStore.getState().connectTo('conn-pg')

    expect(mockInvoke).toHaveBeenCalledWith('connection:connect', 'conn-pg')
    expect(useConnectionStore.getState().activeConnectionId).toBe('conn-pg')
  })

  it('stores connect error and leaves activeConnectionId null on failure', async () => {
    useConnectionStore.setState({ connections: [PG_CONN] })
    mockInvoke.mockRejectedValueOnce(new Error('password wrong'))

    await useConnectionStore.getState().connectTo('conn-pg')

    expect(useConnectionStore.getState().error).toBe('password wrong')
    expect(useConnectionStore.getState().activeConnectionId).toBeNull()
  })

  it('disconnects and clears activeConnectionId when it matches', async () => {
    useConnectionStore.setState({ connections: [PG_CONN], activeConnectionId: 'conn-pg' })
    mockInvoke.mockResolvedValueOnce(undefined)

    await useConnectionStore.getState().disconnectFrom('conn-pg')

    expect(mockInvoke).toHaveBeenCalledWith('connection:disconnect', 'conn-pg')
    expect(useConnectionStore.getState().activeConnectionId).toBeNull()
  })

  it('keeps activeConnectionId when disconnecting a different connection', async () => {
    useConnectionStore.setState({ connections: [PG_CONN, MYSQL_CONN], activeConnectionId: 'conn-mysql' })
    mockInvoke.mockResolvedValueOnce(undefined)

    await useConnectionStore.getState().disconnectFrom('conn-pg')

    expect(useConnectionStore.getState().activeConnectionId).toBe('conn-mysql')
  })

  it('deletes a connection and reloads the list', async () => {
    useConnectionStore.setState({ connections: [PG_CONN, MYSQL_CONN] })
    mockInvoke.mockResolvedValueOnce(undefined)       // connection:delete
    mockInvoke.mockResolvedValueOnce([MYSQL_CONN])    // connection:list

    await useConnectionStore.getState().deleteConnection('conn-pg')

    expect(mockInvoke).toHaveBeenNthCalledWith(1, 'connection:delete', 'conn-pg')
    expect(mockInvoke).toHaveBeenNthCalledWith(2, 'connection:list')
    expect(useConnectionStore.getState().connections).toHaveLength(1)
    expect(useConnectionStore.getState().connections[0].id).toBe('conn-mysql')
  })

  it('switch between two connections — one active at a time', async () => {
    useConnectionStore.setState({ connections: [PG_CONN, MYSQL_CONN] })
    mockInvoke.mockResolvedValue(undefined)

    await useConnectionStore.getState().connectTo('conn-pg')
    expect(useConnectionStore.getState().activeConnectionId).toBe('conn-pg')

    // Disconnect first, then connect second
    await useConnectionStore.getState().disconnectFrom('conn-pg')
    await useConnectionStore.getState().connectTo('conn-mysql')
    expect(useConnectionStore.getState().activeConnectionId).toBe('conn-mysql')
  })
})

// ─── 2. Query execution ───────────────────────────────────────────────────────

describe('Feature: Query execution', () => {
  beforeEach(resetStores)

  it('executes a SELECT and populates result on the active tab', async () => {
    mockInvoke.mockResolvedValueOnce(QUERY_RESULT)
    const { tabs, executeQuery } = useEditorStore.getState()
    const tabId = tabs[0].id

    await executeQuery(tabId, 'conn-pg', 'SELECT id, name FROM users')

    const tab = useEditorStore.getState().tabs[0]
    expect(tab.result).toEqual(QUERY_RESULT)
    expect(tab.isExecuting).toBe(false)
    expect(tab.error).toBeNull()
    expect(tab.connectionId).toBe('conn-pg')
  })

  it('sets isExecuting=true while query is in flight, then false after', async () => {
    let resolveQuery!: (v: unknown) => void
    mockInvoke.mockReturnValueOnce(new Promise((r) => { resolveQuery = r }))

    const { tabs, executeQuery } = useEditorStore.getState()
    const tabId = tabs[0].id

    const p = executeQuery(tabId, 'conn-pg', 'SELECT 1')
    expect(useEditorStore.getState().tabs[0].isExecuting).toBe(true)
    resolveQuery(QUERY_RESULT)
    await p
    expect(useEditorStore.getState().tabs[0].isExecuting).toBe(false)
  })

  it('stores error message on query failure, leaves result null', async () => {
    mockInvoke.mockRejectedValueOnce(new Error('relation "missing" does not exist'))

    const { tabs, executeQuery } = useEditorStore.getState()
    await executeQuery(tabs[0].id, 'conn-pg', 'SELECT * FROM missing')

    const tab = useEditorStore.getState().tabs[0]
    expect(tab.error).toBe('relation "missing" does not exist')
    expect(tab.result).toBeNull()
    expect(tab.isExecuting).toBe(false)
  })

  it('clears previous result and error before a new execution', async () => {
    // Seed stale state
    useEditorStore.setState((s) => ({
      tabs: s.tabs.map((t) =>
        t.id === s.activeTabId
          ? { ...t, result: QUERY_RESULT, error: 'stale error' }
          : t
      ),
    }))

    mockInvoke.mockResolvedValueOnce({ ...QUERY_RESULT, rows: [] })
    const { tabs, executeQuery } = useEditorStore.getState()
    await executeQuery(tabs[0].id, 'conn-pg', 'SELECT 1')

    const tab = useEditorStore.getState().tabs[0]
    expect(tab.error).toBeNull()
    expect(tab.result?.rows).toHaveLength(0)
  })

  it('passes tab.database as 4th IPC arg', async () => {
    // Set database on tab
    useEditorStore.setState((s) => ({
      tabs: s.tabs.map((t) =>
        t.id === s.activeTabId ? { ...t, database: 'analytics' } : t
      ),
    }))
    mockInvoke.mockResolvedValueOnce(QUERY_RESULT)

    const { tabs, executeQuery } = useEditorStore.getState()
    await executeQuery(tabs[0].id, 'conn-pg', 'SELECT 1')

    expect(mockInvoke).toHaveBeenCalledWith('query:execute', 'conn-pg', 'SELECT 1', 'analytics')
  })

  it('passes undefined as database when tab.database is not set', async () => {
    mockInvoke.mockResolvedValueOnce(QUERY_RESULT)
    const { tabs, executeQuery } = useEditorStore.getState()
    await executeQuery(tabs[0].id, 'conn-pg', 'SELECT 1')

    expect(mockInvoke).toHaveBeenCalledWith('query:execute', 'conn-pg', 'SELECT 1', undefined)
  })

  it('sets selectedText and uses it for partial execution logic tracking', () => {
    const { tabs, setSelectedText } = useEditorStore.getState()
    setSelectedText(tabs[0].id, 'SELECT 1')
    expect(useEditorStore.getState().tabs[0].selectedText).toBe('SELECT 1')
  })

  it('row limit can be changed to null (unlimited)', () => {
    const { tabs, setRowLimit } = useEditorStore.getState()
    setRowLimit(tabs[0].id, null)
    expect(useEditorStore.getState().tabs[0].rowLimit).toBeNull()
  })

  it('row limit can be set to 500', () => {
    const { tabs, setRowLimit } = useEditorStore.getState()
    setRowLimit(tabs[0].id, 500)
    expect(useEditorStore.getState().tabs[0].rowLimit).toBe(500)
  })

  it('updateTabContent updates only the targeted tab', () => {
    useEditorStore.getState().addTab()
    const { tabs, updateTabContent } = useEditorStore.getState()
    const [tab1, tab2] = tabs

    updateTabContent(tab1.id, 'SELECT 1')

    const state = useEditorStore.getState()
    expect(state.tabs.find((t) => t.id === tab1.id)?.content).toBe('SELECT 1')
    expect(state.tabs.find((t) => t.id === tab2.id)?.content).toBe('')
  })
})

// ─── 3. Tab management ────────────────────────────────────────────────────────

describe('Feature: Tab management', () => {
  beforeEach(resetStores)

  it('opens a new blank query tab and makes it active', () => {
    useEditorStore.getState().addTab()

    const { tabs, activeTabId } = useEditorStore.getState()
    expect(tabs).toHaveLength(2)
    expect(activeTabId).toBe(tabs[1].id)
    expect(tabs[1].title).toBe('New Query')
    expect(tabs[1].content).toBe('')
  })

  it('addTabWithContent opens a tab with preset title and SQL', () => {
    useEditorStore.getState().addTabWithContent('History replay', 'SELECT * FROM orders', 'salesdb')

    const { tabs, activeTabId } = useEditorStore.getState()
    const newTab = tabs.find((t) => t.id === activeTabId)!
    expect(newTab.title).toBe('History replay')
    expect(newTab.content).toBe('SELECT * FROM orders')
    expect(newTab.database).toBe('salesdb')
  })

  it('closes a tab and switches to the previous one', () => {
    useEditorStore.getState().addTab()
    const { tabs } = useEditorStore.getState()
    const [tab1, tab2] = tabs

    useEditorStore.getState().setActiveTab(tab2.id)
    useEditorStore.getState().closeTab(tab2.id)

    const state = useEditorStore.getState()
    expect(state.tabs).toHaveLength(1)
    expect(state.tabs[0].id).toBe(tab1.id)
    expect(state.activeTabId).toBe(tab1.id)
  })

  it('closing the last tab creates a fresh blank tab (guard)', () => {
    const { tabs } = useEditorStore.getState()
    expect(tabs).toHaveLength(1)

    useEditorStore.getState().closeTab(tabs[0].id)

    const state = useEditorStore.getState()
    expect(state.tabs).toHaveLength(1)
    expect(state.tabs[0].content).toBe('')
    expect(state.tabs[0].result).toBeNull()
  })

  it('setActiveTab switches which tab is active without closing others', () => {
    useEditorStore.getState().addTab()
    useEditorStore.getState().addTab()
    const { tabs } = useEditorStore.getState()

    useEditorStore.getState().setActiveTab(tabs[0].id)

    expect(useEditorStore.getState().activeTabId).toBe(tabs[0].id)
    expect(useEditorStore.getState().tabs).toHaveLength(3)
  })

  it('multiple tabs can hold independent results', async () => {
    const result1 = { ...QUERY_RESULT, rows: [{ id: 1 }], rowCount: 1 }
    const result2 = { ...QUERY_RESULT, rows: [{ id: 99 }], rowCount: 1 }

    useEditorStore.getState().addTab()
    const { tabs } = useEditorStore.getState()
    const [tab1, tab2] = tabs

    mockInvoke.mockResolvedValueOnce(result1)
    await useEditorStore.getState().executeQuery(tab1.id, 'conn-pg', 'SELECT 1')

    mockInvoke.mockResolvedValueOnce(result2)
    await useEditorStore.getState().executeQuery(tab2.id, 'conn-pg', 'SELECT 99')

    const state = useEditorStore.getState()
    expect(state.tabs.find((t) => t.id === tab1.id)?.result?.rows[0]).toEqual({ id: 1 })
    expect(state.tabs.find((t) => t.id === tab2.id)?.result?.rows[0]).toEqual({ id: 99 })
  })

  it('closing a non-active tab does not change activeTabId', () => {
    useEditorStore.getState().addTab()
    const { tabs } = useEditorStore.getState()
    const [tab1, tab2] = tabs

    useEditorStore.getState().setActiveTab(tab2.id)
    useEditorStore.getState().closeTab(tab1.id)

    expect(useEditorStore.getState().activeTabId).toBe(tab2.id)
  })
})

// ─── 4. Snippet CRUD ─────────────────────────────────────────────────────────

describe('Feature: Snippet CRUD', () => {
  beforeEach(resetStores)

  const SNIPPET_A: Snippet = { id: 'snip-1', title: 'Count all', sql: 'SELECT COUNT(*) FROM %%table%%', category: 'utility', createdAt: '2025-01-01' }
  const SNIPPET_B: Snippet = { id: 'snip-2', title: 'Latest records', sql: 'SELECT * FROM %%table%% ORDER BY id DESC LIMIT 10', category: 'data', createdAt: '2025-01-02' }

  it('loads all snippets on startup', async () => {
    mockInvoke.mockResolvedValueOnce([SNIPPET_A, SNIPPET_B])

    await useSnippetStore.getState().loadSnippets()

    expect(mockInvoke).toHaveBeenCalledWith('snippet:list')
    expect(useSnippetStore.getState().snippets).toHaveLength(2)
    expect(useSnippetStore.getState().loading).toBe(false)
  })

  it('saves a new snippet and appends it to the list', async () => {
    mockInvoke.mockResolvedValueOnce(undefined)

    await useSnippetStore.getState().saveSnippet(SNIPPET_A)

    expect(mockInvoke).toHaveBeenCalledWith('snippet:save', SNIPPET_A)
    expect(useSnippetStore.getState().snippets).toHaveLength(1)
    expect(useSnippetStore.getState().snippets[0].title).toBe('Count all')
  })

  it('updates an existing snippet in-place (same id)', async () => {
    useSnippetStore.setState({ snippets: [SNIPPET_A] })
    const updated = { ...SNIPPET_A, title: 'Count all rows' }
    mockInvoke.mockResolvedValueOnce(undefined)

    await useSnippetStore.getState().saveSnippet(updated)

    const { snippets } = useSnippetStore.getState()
    expect(snippets).toHaveLength(1)
    expect(snippets[0].title).toBe('Count all rows')
  })

  it('deletes a snippet and removes it from list', async () => {
    useSnippetStore.setState({ snippets: [SNIPPET_A, SNIPPET_B] })
    mockInvoke.mockResolvedValueOnce(undefined)

    await useSnippetStore.getState().deleteSnippet('snip-1')

    expect(mockInvoke).toHaveBeenCalledWith('snippet:delete', 'snip-1')
    const { snippets } = useSnippetStore.getState()
    expect(snippets).toHaveLength(1)
    expect(snippets[0].id).toBe('snip-2')
  })

  it('setActiveCategory filters the active category', () => {
    useSnippetStore.getState().setActiveCategory('utility')
    expect(useSnippetStore.getState().activeCategory).toBe('utility')

    useSnippetStore.getState().setActiveCategory(null)
    expect(useSnippetStore.getState().activeCategory).toBeNull()
  })

  it('load failure silently resets loading (no crash)', async () => {
    mockInvoke.mockRejectedValueOnce(new Error('IPC timeout'))

    await useSnippetStore.getState().loadSnippets()

    expect(useSnippetStore.getState().loading).toBe(false)
    expect(useSnippetStore.getState().snippets).toHaveLength(0)
  })
})

// ─── 5. Query history ─────────────────────────────────────────────────────────

describe('Feature: Query history', () => {
  beforeEach(resetStores)

  const makeEntry = (overrides: Partial<HistoryEntry> = {}): HistoryEntry => ({
    id: 'h1',
    connectionId: 'conn-pg',
    connectionName: 'Local PG',
    database: 'appdb',
    sql: 'SELECT 1',
    executedAt: '2025-01-01T10:00:00Z',
    executionTimeMs: 5,
    rowCount: 1,
    status: 'success',
    isFavorite: false,
    ...overrides,
  })

  it('loads history entries for a connection', async () => {
    const entries = [makeEntry(), makeEntry({ id: 'h2', sql: 'SELECT NOW()' })]
    mockInvoke.mockResolvedValueOnce(entries)

    await useHistoryStore.getState().loadHistory('conn-pg')

    expect(mockInvoke).toHaveBeenCalledWith('history:list', 'conn-pg', 200)
    expect(useHistoryStore.getState().entries).toHaveLength(2)
  })

  it('searches history and sets searchQuery', async () => {
    const results = [makeEntry({ sql: 'SELECT * FROM orders' })]
    mockInvoke.mockResolvedValueOnce(results)

    await useHistoryStore.getState().search('orders', 'conn-pg')

    expect(mockInvoke).toHaveBeenCalledWith('history:search', 'orders', 'conn-pg')
    expect(useHistoryStore.getState().searchQuery).toBe('orders')
    expect(useHistoryStore.getState().entries).toHaveLength(1)
  })

  it('search with empty query falls back to list', async () => {
    const all = [makeEntry()]
    mockInvoke.mockResolvedValueOnce(all)

    await useHistoryStore.getState().search('', 'conn-pg')

    expect(mockInvoke).toHaveBeenCalledWith('history:list', 'conn-pg', 200)
  })

  it('toggleFavorite flips isFavorite on the entry', async () => {
    useHistoryStore.setState({ entries: [makeEntry({ id: 'h1', isFavorite: false })] })
    mockInvoke.mockResolvedValueOnce(undefined)

    await useHistoryStore.getState().toggleFavorite('h1')

    expect(mockInvoke).toHaveBeenCalledWith('history:toggle-favorite', 'h1')
    expect(useHistoryStore.getState().entries[0].isFavorite).toBe(true)

    // Toggle back
    mockInvoke.mockResolvedValueOnce(undefined)
    await useHistoryStore.getState().toggleFavorite('h1')
    expect(useHistoryStore.getState().entries[0].isFavorite).toBe(false)
  })

  it('deleteEntry removes only the specified entry', async () => {
    useHistoryStore.setState({
      entries: [makeEntry({ id: 'h1' }), makeEntry({ id: 'h2', sql: 'SELECT NOW()' })],
    })
    mockInvoke.mockResolvedValueOnce(undefined)

    await useHistoryStore.getState().deleteEntry('h1')

    expect(useHistoryStore.getState().entries).toHaveLength(1)
    expect(useHistoryStore.getState().entries[0].id).toBe('h2')
  })

  it('clearHistory removes non-favorite entries and keeps favorites', async () => {
    useHistoryStore.setState({
      entries: [
        makeEntry({ id: 'h1', isFavorite: true }),
        makeEntry({ id: 'h2', isFavorite: false }),
        makeEntry({ id: 'h3', isFavorite: true }),
      ],
    })
    mockInvoke.mockResolvedValueOnce(undefined)

    await useHistoryStore.getState().clearHistory('conn-pg')

    expect(mockInvoke).toHaveBeenCalledWith('history:clear', 'conn-pg')
    const { entries } = useHistoryStore.getState()
    expect(entries).toHaveLength(2)
    expect(entries.every((e) => e.isFavorite)).toBe(true)
  })

  it('setSearchQuery updates query without network call', () => {
    useHistoryStore.getState().setSearchQuery('JOIN')
    expect(useHistoryStore.getState().searchQuery).toBe('JOIN')
    expect(mockInvoke).not.toHaveBeenCalled()
  })
})

// ─── 6. Table designer ────────────────────────────────────────────────────────

describe('Feature: Table designer', () => {
  beforeEach(resetStores)

  it('opens a "create" designer tab with empty state', async () => {
    await useEditorStore.getState().openTableDesigner('conn-pg', 'public')

    const { tabs, activeTabId } = useEditorStore.getState()
    const tab = tabs.find((t) => t.id === activeTabId)!
    expect(tab.type).toBe('table-designer')
    expect(tab.title).toBe('New Table')
    expect(tab.designerMode).toBe('create')
    expect(tab.designerState?.tableName).toBe('')
    expect(tab.designerState?.columns).toHaveLength(0)
    expect(tab.designerState?.schema).toBe('public')
  })

  it('opens an "alter" designer tab by loading existing table structure', async () => {
    const columns = [
      { name: 'id', displayType: 'serial', type: 'integer', nullable: false, isPrimaryKey: true, isForeignKey: false, defaultValue: undefined, comment: undefined },
      { name: 'email', displayType: 'varchar(255)', type: 'character varying', nullable: false, isPrimaryKey: false, isForeignKey: false, defaultValue: undefined, comment: undefined },
    ]
    const indexes = [
      { name: 'users_pkey', columns: ['id'], isUnique: true, isPrimary: true },
      { name: 'users_email_idx', columns: ['email'], isUnique: true, isPrimary: false },
    ]
    const relationships: never[] = []

    mockInvoke
      .mockResolvedValueOnce(columns)       // schema:columns
      .mockResolvedValueOnce(indexes)       // schema:indexes
      .mockResolvedValueOnce(relationships) // schema:relationships
      .mockResolvedValueOnce(false)         // schema:supports-schemas

    await useEditorStore.getState().openTableDesigner('conn-pg', 'public', 'users')

    const { tabs, activeTabId } = useEditorStore.getState()
    const tab = tabs.find((t) => t.id === activeTabId)!

    expect(tab.type).toBe('table-designer')
    expect(tab.title).toBe('Design: users')
    expect(tab.designerMode).toBe('alter')
    expect(tab.designerState?.tableName).toBe('users')
    expect(tab.designerState?.columns).toHaveLength(2)
    expect(tab.designerState?.columns[0].name).toBe('id')
    expect(tab.designerState?.columns[0].isPrimaryKey).toBe(true)
    // Primary key index is filtered out from designerIndexes
    expect(tab.designerState?.indexes).toHaveLength(1)
    expect(tab.designerState?.indexes[0].name).toBe('users_email_idx')
  })

  it('updateDesignerState patches only the targeted tab', async () => {
    // Create designer
    await useEditorStore.getState().openTableDesigner('conn-pg', 'public')
    const { tabs, activeTabId } = useEditorStore.getState()
    const designerTabId = activeTabId!

    const newState = {
      database: undefined,
      schema: 'public',
      tableName: 'products',
      columns: [{ _tempId: 't1', name: 'sku', type: 'varchar(64)', nullable: false, defaultValue: '', isPrimaryKey: false, comment: '' }],
      indexes: [],
      foreignKeys: [],
      enums: [],
    }
    useEditorStore.getState().updateDesignerState(designerTabId, newState)

    const updated = useEditorStore.getState().tabs.find((t) => t.id === designerTabId)!
    expect(updated.designerState?.tableName).toBe('products')
    expect(updated.designerState?.columns).toHaveLength(1)

    // Other tabs are unchanged
    const otherTab = useEditorStore.getState().tabs.find((t) => t.id !== designerTabId)
    expect(otherTab?.designerState).toBeUndefined()
  })

  it('alter designer preserves originalState as a deep clone', async () => {
    const columns = [{ name: 'id', displayType: 'serial', type: 'integer', nullable: false, isPrimaryKey: true, isForeignKey: false }]
    mockInvoke
      .mockResolvedValueOnce(columns)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce(false)

    await useEditorStore.getState().openTableDesigner('conn-pg', 'public', 'items')

    const { tabs, activeTabId } = useEditorStore.getState()
    const tab = tabs.find((t) => t.id === activeTabId)!

    expect(tab.designerOriginalState).toBeDefined()
    // original must be a separate object (deep clone)
    expect(tab.designerOriginalState).not.toBe(tab.designerState)
    expect(tab.designerOriginalState?.columns[0].name).toBe('id')
  })
})

// ─── 7. Mindmap tab ───────────────────────────────────────────────────────────

describe('Feature: Mindmap tab', () => {
  beforeEach(resetStores)

  it('opens a mindmap tab scoped to database and schema', () => {
    useEditorStore.getState().openMindmap('analytics', 'reporting')

    const { tabs, activeTabId } = useEditorStore.getState()
    const tab = tabs.find((t) => t.id === activeTabId)!
    expect(tab.type).toBe('mindmap')
    expect(tab.title).toBe('Mindmap: analytics/reporting')
    expect(tab.mindmapDatabase).toBe('analytics')
    expect(tab.mindmapSchema).toBe('reporting')
  })

  it('opens a mindmap tab scoped to database only (no schema)', () => {
    useEditorStore.getState().openMindmap('mydb')

    const { tabs, activeTabId } = useEditorStore.getState()
    const tab = tabs.find((t) => t.id === activeTabId)!
    expect(tab.title).toBe('Mindmap: mydb')
    expect(tab.mindmapSchema).toBeUndefined()
  })

  it('opens a generic mindmap tab when no db/schema is provided', () => {
    useEditorStore.getState().openMindmap()

    const { tabs, activeTabId } = useEditorStore.getState()
    const tab = tabs.find((t) => t.id === activeTabId)!
    expect(tab.title).toBe('Mindmap')
    expect(tab.mindmapDatabase).toBeUndefined()
  })
})

// ─── 8. Full end-to-end flow ──────────────────────────────────────────────────

describe('E2E: Connect → query → history → multi-tab workflow', () => {
  beforeEach(resetStores)

  it('full flow: connect, run query, open history, replay query in new tab', async () => {
    // Step 1 — load connections
    mockInvoke.mockResolvedValueOnce([PG_CONN])
    await useConnectionStore.getState().loadConnections()
    expect(useConnectionStore.getState().connections).toHaveLength(1)

    // Step 2 — connect
    mockInvoke.mockResolvedValueOnce(undefined)
    await useConnectionStore.getState().connectTo('conn-pg')
    expect(useConnectionStore.getState().activeConnectionId).toBe('conn-pg')

    // Step 3 — run a query in the initial tab
    mockInvoke.mockResolvedValueOnce(QUERY_RESULT)
    const { tabs, executeQuery } = useEditorStore.getState()
    const tab1Id = tabs[0].id
    await executeQuery(tab1Id, 'conn-pg', 'SELECT id, name FROM users')

    const tab1 = useEditorStore.getState().tabs[0]
    expect(tab1.result?.rowCount).toBe(2)
    expect(tab1.connectionId).toBe('conn-pg')

    // Step 4 — history loads recent entries
    const historyEntry: HistoryEntry = {
      id: 'h1', connectionId: 'conn-pg', connectionName: 'Local PG', database: 'appdb',
      sql: 'SELECT id, name FROM users', executedAt: '2025-01-01T10:00:00Z',
      executionTimeMs: 12, rowCount: 2, status: 'success', isFavorite: false,
    }
    mockInvoke.mockResolvedValueOnce([historyEntry])
    await useHistoryStore.getState().loadHistory('conn-pg')
    expect(useHistoryStore.getState().entries).toHaveLength(1)

    // Step 5 — replay query from history in a new tab
    useEditorStore.getState().addTabWithContent('History replay', historyEntry.sql, historyEntry.database)
    const state = useEditorStore.getState()
    const replayTab = state.tabs.find((t) => t.id === state.activeTabId)!
    expect(replayTab.content).toBe('SELECT id, name FROM users')
    expect(replayTab.database).toBe('appdb')

    // Step 6 — run the replayed query
    mockInvoke.mockResolvedValueOnce(QUERY_RESULT)
    await useEditorStore.getState().executeQuery(replayTab.id, 'conn-pg', replayTab.content)
    const replayed = useEditorStore.getState().tabs.find((t) => t.id === replayTab.id)!
    expect(replayed.result?.rowCount).toBe(2)

    // Step 7 — original tab1 is unchanged
    const originalTab = useEditorStore.getState().tabs.find((t) => t.id === tab1Id)!
    expect(originalTab.result?.rowCount).toBe(2)
    expect(originalTab.connectionId).toBe('conn-pg')

    // Step 8 — total tabs = original + replay
    expect(useEditorStore.getState().tabs).toHaveLength(2)
  })

  it('E2E: snippet usage — save SQL, load it into a tab, run it', async () => {
    const snippet: Snippet = {
      id: 's1', title: 'Top 10 users', sql: 'SELECT * FROM users LIMIT 10',
      category: 'data', createdAt: '2025-01-01',
    }

    // Save snippet
    mockInvoke.mockResolvedValueOnce(undefined)
    await useSnippetStore.getState().saveSnippet(snippet)
    expect(useSnippetStore.getState().snippets).toHaveLength(1)

    // Open snippet in new tab
    useEditorStore.getState().addTabWithContent(snippet.title, snippet.sql)
    const { tabs, activeTabId } = useEditorStore.getState()
    const tab = tabs.find((t) => t.id === activeTabId)!
    expect(tab.content).toBe('SELECT * FROM users LIMIT 10')

    // Run it
    mockInvoke.mockResolvedValueOnce({ ...QUERY_RESULT, rowCount: 10 })
    await useEditorStore.getState().executeQuery(tab.id, 'conn-pg', tab.content)

    expect(useEditorStore.getState().tabs.find((t) => t.id === tab.id)?.result?.rowCount).toBe(10)
  })

  it('E2E: error recovery — failed query, fix SQL, succeed on retry', async () => {
    const { tabs, executeQuery } = useEditorStore.getState()
    const tabId = tabs[0].id

    // First attempt fails
    mockInvoke.mockRejectedValueOnce(new Error('syntax error at position 7'))
    await executeQuery(tabId, 'conn-pg', 'SLECT 1')
    expect(useEditorStore.getState().tabs[0].error).toBe('syntax error at position 7')

    // Fix content
    useEditorStore.getState().updateTabContent(tabId, 'SELECT 1')

    // Second attempt succeeds
    const singleRow = { columns: [{ name: '1', dataType: 'int4' }], rows: [{ '1': 1 }], rowCount: 1, executionTimeMs: 2 }
    mockInvoke.mockResolvedValueOnce(singleRow)
    await useEditorStore.getState().executeQuery(tabId, 'conn-pg', 'SELECT 1')

    const tab = useEditorStore.getState().tabs[0]
    expect(tab.error).toBeNull()
    expect(tab.result?.rowCount).toBe(1)
  })

  it('E2E: multi-connection session — each tab remembers its connection', async () => {
    // Connect PG
    mockInvoke.mockResolvedValueOnce(undefined)
    await useConnectionStore.getState().connectTo('conn-pg')

    // Run query on tab 1 under PG
    mockInvoke.mockResolvedValueOnce(QUERY_RESULT)
    const { tabs, executeQuery } = useEditorStore.getState()
    await executeQuery(tabs[0].id, 'conn-pg', 'SELECT 1')
    expect(useEditorStore.getState().tabs[0].connectionId).toBe('conn-pg')

    // Open tab 2
    useEditorStore.getState().addTab()
    const { tabs: tabs2 } = useEditorStore.getState()
    const tab2 = tabs2[tabs2.length - 1]

    // Switch to MySQL and run on tab 2
    mockInvoke.mockResolvedValueOnce(undefined)
    await useConnectionStore.getState().connectTo('conn-mysql')

    mockInvoke.mockResolvedValueOnce({ ...QUERY_RESULT, rows: [{ version: '8.0' }], rowCount: 1 })
    await useEditorStore.getState().executeQuery(tab2.id, 'conn-mysql', 'SELECT VERSION()')
    expect(useEditorStore.getState().tabs.find((t) => t.id === tab2.id)?.connectionId).toBe('conn-mysql')

    // Tab 1 connectionId still PG
    expect(useEditorStore.getState().tabs[0].connectionId).toBe('conn-pg')
  })

  it('E2E: history search filters results', async () => {
    const entries: HistoryEntry[] = [
      { id: 'h1', connectionId: 'conn-pg', connectionName: 'Local PG', database: 'appdb', sql: 'SELECT * FROM orders', executedAt: '2025-01-01T10:00Z', executionTimeMs: 10, rowCount: 5, status: 'success', isFavorite: false },
      { id: 'h2', connectionId: 'conn-pg', connectionName: 'Local PG', database: 'appdb', sql: 'SELECT * FROM users', executedAt: '2025-01-01T11:00Z', executionTimeMs: 8, rowCount: 3, status: 'success', isFavorite: true },
    ]

    // Load all
    mockInvoke.mockResolvedValueOnce(entries)
    await useHistoryStore.getState().loadHistory('conn-pg')
    expect(useHistoryStore.getState().entries).toHaveLength(2)

    // Search narrows
    mockInvoke.mockResolvedValueOnce([entries[0]])
    await useHistoryStore.getState().search('orders', 'conn-pg')
    expect(useHistoryStore.getState().entries).toHaveLength(1)
    expect(useHistoryStore.getState().entries[0].sql).toContain('orders')

    // Clear history — only favorite survives
    mockInvoke.mockResolvedValueOnce(undefined)
    useHistoryStore.setState({ entries })
    await useHistoryStore.getState().clearHistory('conn-pg')
    expect(useHistoryStore.getState().entries).toHaveLength(1)
    expect(useHistoryStore.getState().entries[0].id).toBe('h2')
  })
})
