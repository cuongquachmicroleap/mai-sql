import { describe, it, expect, vi, beforeEach } from 'vitest'

const { handlers } = vi.hoisted(() => ({
  handlers: new Map<string, Function>(),
}))

vi.mock('electron', () => ({
  ipcMain: {
    handle: vi.fn((channel: string, handler: Function) => {
      handlers.set(channel, handler)
    }),
  },
}))

vi.mock('../../managers/connection-manager', () => ({
  connectionManager: {
    getDriver: vi.fn(),
  },
}))

import '../../ipc/schema'
import { connectionManager } from '../../managers/connection-manager'

const fakeEvent = {} as Electron.IpcMainInvokeEvent
const connId = 'conn-1'

const mockDriver = {
  getDatabases: vi.fn(),
  getSchemas: vi.fn(),
  getTables: vi.fn(),
  getColumns: vi.fn(),
  getIndexes: vi.fn(),
  getTriggers: vi.fn(),
  getFunctions: vi.fn(),
  getRelationships: vi.fn(),
}

describe('IPC schema handlers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(connectionManager.getDriver).mockReturnValue(mockDriver as any)
  })

  // ─── Not connected guard ──────────────────────────────────────────────────

  it.each([
    ['schema:databases', [connId]],
    ['schema:schemas', [connId, 'mydb']],
    ['schema:tables', [connId, 'public']],
    ['schema:columns', [connId, 'users']],
    ['schema:indexes', [connId, 'users', 'public']],
    ['schema:triggers', [connId, 'users', 'public']],
    ['schema:functions', [connId, 'public']],
    ['schema:relationships', [connId, 'public']],
  ] as [string, unknown[]][])('%s throws when not connected', async (channel, args) => {
    vi.mocked(connectionManager.getDriver).mockReturnValue(undefined)
    await expect(handlers.get(channel)!(fakeEvent, ...args)).rejects.toThrow(
      `Not connected to '${connId}'`,
    )
  })

  // ─── schema:databases ─────────────────────────────────────────────────────

  it('schema:databases returns databases', async () => {
    mockDriver.getDatabases.mockResolvedValueOnce(['postgres', 'app'])
    const result = await handlers.get('schema:databases')!(fakeEvent, connId)
    expect(mockDriver.getDatabases).toHaveBeenCalled()
    expect(result).toEqual(['postgres', 'app'])
  })

  // ─── schema:schemas ───────────────────────────────────────────────────────

  it('schema:schemas calls getSchemas with database arg', async () => {
    mockDriver.getSchemas.mockResolvedValueOnce(['public', 'app'])
    const result = await handlers.get('schema:schemas')!(fakeEvent, connId, 'mydb')
    expect(mockDriver.getSchemas).toHaveBeenCalledWith('mydb')
    expect(result).toEqual(['public', 'app'])
  })

  // ─── schema:tables ────────────────────────────────────────────────────────

  it('schema:tables calls getTables with schema arg', async () => {
    const tables = [{ name: 'users', schema: 'public', type: 'table' }]
    mockDriver.getTables.mockResolvedValueOnce(tables)
    const result = await handlers.get('schema:tables')!(fakeEvent, connId, 'public')
    expect(mockDriver.getTables).toHaveBeenCalledWith('public')
    expect(result).toBe(tables)
  })

  // ─── schema:columns ───────────────────────────────────────────────────────

  it('schema:columns calls getColumns with table and optional schema', async () => {
    const cols = [{ name: 'id', type: 'integer' }]
    mockDriver.getColumns.mockResolvedValueOnce(cols)
    const result = await handlers.get('schema:columns')!(fakeEvent, connId, 'users', 'public')
    expect(mockDriver.getColumns).toHaveBeenCalledWith('users', 'public')
    expect(result).toBe(cols)
  })

  it('schema:columns works without optional schema (undefined)', async () => {
    mockDriver.getColumns.mockResolvedValueOnce([])
    await handlers.get('schema:columns')!(fakeEvent, connId, 'users')
    expect(mockDriver.getColumns).toHaveBeenCalledWith('users', undefined)
  })

  // ─── schema:indexes ───────────────────────────────────────────────────────

  it('schema:indexes calls getIndexes', async () => {
    const indexes = [{ name: 'users_pkey', columns: ['id'], isUnique: true, isPrimary: true }]
    mockDriver.getIndexes.mockResolvedValueOnce(indexes)
    const result = await handlers.get('schema:indexes')!(fakeEvent, connId, 'users', 'public')
    expect(mockDriver.getIndexes).toHaveBeenCalledWith('users', 'public')
    expect(result).toBe(indexes)
  })

  // ─── schema:triggers ──────────────────────────────────────────────────────

  it('schema:triggers calls getTriggers', async () => {
    const triggers = [{ name: 'audit', event: 'INSERT', timing: 'AFTER', orientation: 'ROW' }]
    mockDriver.getTriggers.mockResolvedValueOnce(triggers)
    const result = await handlers.get('schema:triggers')!(fakeEvent, connId, 'users', 'public')
    expect(mockDriver.getTriggers).toHaveBeenCalledWith('users', 'public')
    expect(result).toBe(triggers)
  })

  // ─── schema:functions ─────────────────────────────────────────────────────

  it('schema:functions calls getFunctions', async () => {
    const fns = [{ name: 'get_user', returnType: 'record', language: 'plpgsql', kind: 'function' }]
    mockDriver.getFunctions.mockResolvedValueOnce(fns)
    const result = await handlers.get('schema:functions')!(fakeEvent, connId, 'public')
    expect(mockDriver.getFunctions).toHaveBeenCalledWith('public')
    expect(result).toBe(fns)
  })

  // ─── schema:relationships ─────────────────────────────────────────────────

  it('schema:relationships calls getRelationships', async () => {
    const rels = [
      {
        constraintName: 'fk_1',
        sourceTable: 'orders',
        sourceColumn: 'user_id',
        targetTable: 'users',
        targetColumn: 'id',
      },
    ]
    mockDriver.getRelationships.mockResolvedValueOnce(rels)
    const result = await handlers.get('schema:relationships')!(fakeEvent, connId, 'public')
    expect(mockDriver.getRelationships).toHaveBeenCalledWith('public')
    expect(result).toBe(rels)
  })
})
