import { describe, it, expect, vi, beforeEach } from 'vitest'

// ─── Capture ipcMain handlers (must use vi.hoisted to survive mock hoisting) ──
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
    listConnections: vi.fn().mockReturnValue([]),
  },
}))

vi.mock('../../managers/history-manager', () => ({
  historyManager: {
    add: vi.fn(),
  },
}))

// Import after mocks — registers handlers as a side effect
import '../../ipc/queries'
import { connectionManager } from '../../managers/connection-manager'

const fakeEvent = {} as Electron.IpcMainInvokeEvent

const mockDriver = { execute: vi.fn() }

describe('IPC query:execute', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('calls driver.execute with the provided SQL', async () => {
    vi.mocked(connectionManager.getDriver).mockReturnValue(mockDriver as any)
    const queryResult = { rows: [{ id: 1 }], columns: [], rowCount: 1, executionTimeMs: 5 }
    mockDriver.execute.mockResolvedValueOnce(queryResult)

    const handler = handlers.get('query:execute')!
    const result = await handler(fakeEvent, 'conn-1', 'SELECT 1')

    expect(connectionManager.getDriver).toHaveBeenCalledWith('conn-1')
    expect(mockDriver.execute).toHaveBeenCalledWith('SELECT 1', undefined, undefined)
    expect(result).toBe(queryResult)
  })

  it('throws when driver is not found (not connected)', async () => {
    vi.mocked(connectionManager.getDriver).mockReturnValue(undefined)

    const handler = handlers.get('query:execute')!
    await expect(handler(fakeEvent, 'missing-conn', 'SELECT 1')).rejects.toThrow(
      "Not connected to 'missing-conn'. Call connection:connect first.",
    )
  })

  it('propagates errors from driver.execute', async () => {
    vi.mocked(connectionManager.getDriver).mockReturnValue(mockDriver as any)
    mockDriver.execute.mockRejectedValueOnce(new Error('syntax error'))

    const handler = handlers.get('query:execute')!
    await expect(handler(fakeEvent, 'conn-1', 'SELECT !')).rejects.toThrow('syntax error')
  })
})

describe('IPC query:cancel', () => {
  it('is a no-op stub that resolves without error', async () => {
    const handler = handlers.get('query:cancel')!
    await expect(handler(fakeEvent, 'some-query-id')).resolves.toBeUndefined()
  })
})
