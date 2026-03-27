import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockInvoke, counter } = vi.hoisted(() => ({
  mockInvoke: vi.fn(),
  counter: { value: 0 },
}))
vi.mock('../../lib/ipc-client', () => ({ invoke: mockInvoke }))
vi.mock('nanoid', () => ({ nanoid: () => `tab-${++counter.value}` }))

import { useEditorStore } from '../editor-store'

const INIT_TAB_ID = 'tab-init'

function getState() {
  return useEditorStore.getState()
}

function makeTab(id = INIT_TAB_ID) {
  return {
    id,
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

describe('useEditorStore', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    counter.value = 0
    useEditorStore.setState({
      tabs: [makeTab()],
      activeTabId: INIT_TAB_ID,
    })
  })

  // ─── Initial state ────────────────────────────────────────────────────────

  it('initializes with one tab', () => {
    expect(getState().tabs).toHaveLength(1)
    expect(getState().tabs[0].title).toBe('New Query')
    expect(getState().tabs[0].rowLimit).toBe(100)
  })

  // ─── addTab ───────────────────────────────────────────────────────────────

  it('addTab adds a new tab and sets it as active', () => {
    getState().addTab()
    const state = getState()
    expect(state.tabs).toHaveLength(2)
    expect(state.activeTabId).toBe(state.tabs[1].id)
  })

  it('addTab creates tab with rowLimit 100 and empty content', () => {
    getState().addTab()
    const newTab = getState().tabs[1]
    expect(newTab.rowLimit).toBe(100)
    expect(newTab.content).toBe('')
    expect(newTab.result).toBeNull()
  })

  // ─── closeTab ─────────────────────────────────────────────────────────────

  it('closeTab removes the tab by id', () => {
    getState().addTab()
    const secondId = getState().tabs[1].id
    getState().closeTab(INIT_TAB_ID)
    expect(getState().tabs).toHaveLength(1)
    expect(getState().tabs[0].id).toBe(secondId)
  })

  it('closeTab switches activeTabId to last remaining tab when active is closed', () => {
    getState().addTab()
    const secondId = getState().tabs[1].id
    useEditorStore.setState({ activeTabId: secondId })
    getState().closeTab(secondId)
    expect(getState().activeTabId).toBe(INIT_TAB_ID)
  })

  it('closeTab keeps activeTabId when a non-active tab is closed', () => {
    getState().addTab()
    const secondId = getState().tabs[1].id
    useEditorStore.setState({ activeTabId: secondId })
    getState().closeTab(INIT_TAB_ID)
    expect(getState().activeTabId).toBe(secondId)
  })

  it('closeTab creates a replacement tab when closing the last tab', () => {
    getState().closeTab(INIT_TAB_ID)
    const state = getState()
    expect(state.tabs).toHaveLength(1)
    expect(state.tabs[0].id).not.toBe(INIT_TAB_ID)
  })

  // ─── setActiveTab ─────────────────────────────────────────────────────────

  it('setActiveTab updates activeTabId', () => {
    getState().addTab()
    getState().setActiveTab(INIT_TAB_ID)
    expect(getState().activeTabId).toBe(INIT_TAB_ID)
  })

  // ─── updateTabContent ─────────────────────────────────────────────────────

  it('updateTabContent updates content of the target tab', () => {
    getState().updateTabContent(INIT_TAB_ID, 'SELECT 1')
    expect(getState().tabs[0].content).toBe('SELECT 1')
  })

  it('updateTabContent does not affect other tabs', () => {
    getState().addTab()
    const secondId = getState().tabs[1].id
    getState().updateTabContent(INIT_TAB_ID, 'SELECT 1')
    expect(getState().tabs.find((t) => t.id === secondId)!.content).toBe('')
  })

  // ─── setRowLimit ──────────────────────────────────────────────────────────

  it('setRowLimit updates the row limit', () => {
    getState().setRowLimit(INIT_TAB_ID, 500)
    expect(getState().tabs[0].rowLimit).toBe(500)
  })

  it('setRowLimit accepts null (no limit)', () => {
    getState().setRowLimit(INIT_TAB_ID, null)
    expect(getState().tabs[0].rowLimit).toBeNull()
  })

  // ─── setSelectedText ──────────────────────────────────────────────────────

  it('setSelectedText updates selected text on the tab', () => {
    getState().setSelectedText(INIT_TAB_ID, 'SELECT id')
    expect(getState().tabs[0].selectedText).toBe('SELECT id')
  })

  // ─── executeQuery ─────────────────────────────────────────────────────────

  it('sets result and connectionId on success', async () => {
    const queryResult = {
      columns: [{ name: 'id', dataType: 'int4' }],
      rows: [{ id: 1 }],
      rowCount: 1,
      executionTimeMs: 5,
    }
    mockInvoke.mockResolvedValueOnce(queryResult)

    await getState().executeQuery(INIT_TAB_ID, 'conn-1', 'SELECT 1')

    const tab = getState().tabs[0]
    expect(mockInvoke).toHaveBeenCalledWith('query:execute', 'conn-1', 'SELECT 1', undefined)
    expect(tab.result).toBe(queryResult)
    expect(tab.isExecuting).toBe(false)
    expect(tab.error).toBeNull()
    expect(tab.connectionId).toBe('conn-1')
  })

  it('sets error on query failure', async () => {
    mockInvoke.mockRejectedValueOnce(new Error('relation does not exist'))

    await getState().executeQuery(INIT_TAB_ID, 'conn-1', 'SELECT * FROM bad')

    const tab = getState().tabs[0]
    expect(tab.error).toBe('relation does not exist')
    expect(tab.isExecuting).toBe(false)
    expect(tab.result).toBeNull()
  })

  it('clears previous result/error and sets isExecuting during execution', async () => {
    // Seed pre-existing state
    useEditorStore.setState({
      tabs: [
        {
          ...makeTab(),
          result: { columns: [], rows: [], rowCount: 0, executionTimeMs: 0 },
          error: 'old error',
        },
      ],
      activeTabId: INIT_TAB_ID,
    })

    let capturedTab: ReturnType<typeof getState>['tabs'][number] | undefined
    mockInvoke.mockImplementationOnce(async () => {
      capturedTab = getState().tabs[0]
      return { columns: [], rows: [], rowCount: 0, executionTimeMs: 1 }
    })

    await getState().executeQuery(INIT_TAB_ID, 'conn-1', 'SELECT 1')

    expect(capturedTab?.isExecuting).toBe(true)
    expect(capturedTab?.result).toBeNull()
    expect(capturedTab?.error).toBeNull()
  })
})
