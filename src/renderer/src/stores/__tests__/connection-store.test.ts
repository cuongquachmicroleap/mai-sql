import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockInvoke } = vi.hoisted(() => ({ mockInvoke: vi.fn() }))
vi.mock('../../lib/ipc-client', () => ({ invoke: mockInvoke }))

import { useConnectionStore } from '../connection-store'

const saved = [
  {
    id: 'c1',
    name: 'Local PG',
    type: 'postgresql',
    host: 'localhost',
    port: 5432,
    database: 'db',
    username: 'u',
    createdAt: '2024-01-01',
  },
]

describe('useConnectionStore', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useConnectionStore.setState({
      connections: [],
      activeConnectionId: null,
      loading: false,
      error: null,
    })
  })

  // ─── loadConnections ──────────────────────────────────────────────────────

  it('sets connections on success', async () => {
    mockInvoke.mockResolvedValueOnce(saved)

    await useConnectionStore.getState().loadConnections()

    const state = useConnectionStore.getState()
    expect(mockInvoke).toHaveBeenCalledWith('connection:list')
    expect(state.connections).toEqual(saved)
    expect(state.loading).toBe(false)
    expect(state.error).toBeNull()
  })

  it('sets error on failure', async () => {
    mockInvoke.mockRejectedValueOnce(new Error('IPC error'))

    await useConnectionStore.getState().loadConnections()

    const state = useConnectionStore.getState()
    expect(state.error).toBe('IPC error')
    expect(state.loading).toBe(false)
    expect(state.connections).toEqual([])
  })

  it('sets loading true while in-flight', async () => {
    let resolveInvoke!: (v: unknown) => void
    mockInvoke.mockReturnValueOnce(new Promise((r) => { resolveInvoke = r }))

    const promise = useConnectionStore.getState().loadConnections()
    expect(useConnectionStore.getState().loading).toBe(true)
    resolveInvoke(saved)
    await promise
    expect(useConnectionStore.getState().loading).toBe(false)
  })

  // ─── connectTo ────────────────────────────────────────────────────────────

  it('sets activeConnectionId on success', async () => {
    mockInvoke.mockResolvedValueOnce(undefined)

    await useConnectionStore.getState().connectTo('c1')

    const state = useConnectionStore.getState()
    expect(mockInvoke).toHaveBeenCalledWith('connection:connect', 'c1')
    expect(state.activeConnectionId).toBe('c1')
    expect(state.loading).toBe(false)
  })

  it('sets error on connect failure', async () => {
    mockInvoke.mockRejectedValueOnce(new Error('no password'))

    await useConnectionStore.getState().connectTo('c1')

    const state = useConnectionStore.getState()
    expect(state.error).toBe('no password')
    expect(state.activeConnectionId).toBeNull()
  })

  // ─── disconnectFrom ───────────────────────────────────────────────────────

  it('clears activeConnectionId when it matches disconnected id', async () => {
    useConnectionStore.setState({ activeConnectionId: 'c1' })
    mockInvoke.mockResolvedValueOnce(undefined)

    await useConnectionStore.getState().disconnectFrom('c1')

    expect(mockInvoke).toHaveBeenCalledWith('connection:disconnect', 'c1')
    expect(useConnectionStore.getState().activeConnectionId).toBeNull()
  })

  it('keeps activeConnectionId when disconnecting a different connection', async () => {
    useConnectionStore.setState({ activeConnectionId: 'c2' })
    mockInvoke.mockResolvedValueOnce(undefined)

    await useConnectionStore.getState().disconnectFrom('c1')

    expect(useConnectionStore.getState().activeConnectionId).toBe('c2')
  })

  // ─── deleteConnection ─────────────────────────────────────────────────────

  it('calls delete then reloads connections', async () => {
    mockInvoke.mockResolvedValueOnce(undefined) // delete
    mockInvoke.mockResolvedValueOnce([])        // list

    await useConnectionStore.getState().deleteConnection('c1')

    expect(mockInvoke).toHaveBeenNthCalledWith(1, 'connection:delete', 'c1')
    expect(mockInvoke).toHaveBeenNthCalledWith(2, 'connection:list')
  })
})
