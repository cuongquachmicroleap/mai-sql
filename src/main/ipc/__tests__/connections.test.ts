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
    listConnections: vi.fn(),
    saveConnection: vi.fn(),
    deleteConnection: vi.fn(),
    testConnection: vi.fn(),
    connect: vi.fn(),
    disconnect: vi.fn(),
  },
}))

import '../../ipc/connections'
import { connectionManager } from '../../managers/connection-manager'
import type { ConnectionConfig } from '../../../shared/types/connection'

const fakeEvent = {} as Electron.IpcMainInvokeEvent

const testConfig: ConnectionConfig = {
  id: 'conn-1',
  name: 'Test',
  type: 'postgresql',
  host: 'localhost',
  port: 5432,
  database: 'db',
  username: 'user',
  password: 'pass',
}

describe('IPC connection handlers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('connection:list returns connections from manager', async () => {
    const saved = [{ id: 'conn-1', name: 'Test', type: 'postgresql' }]
    vi.mocked(connectionManager.listConnections).mockReturnValue(saved as any)

    const result = await handlers.get('connection:list')!(fakeEvent)

    expect(connectionManager.listConnections).toHaveBeenCalled()
    expect(result).toBe(saved)
  })

  it('connection:save calls saveConnection with config', async () => {
    vi.mocked(connectionManager.saveConnection).mockResolvedValue(undefined)

    await handlers.get('connection:save')!(fakeEvent, testConfig)

    expect(connectionManager.saveConnection).toHaveBeenCalledWith(testConfig)
  })

  it('connection:delete calls deleteConnection with id', async () => {
    vi.mocked(connectionManager.deleteConnection).mockResolvedValue(undefined)

    await handlers.get('connection:delete')!(fakeEvent, 'conn-1')

    expect(connectionManager.deleteConnection).toHaveBeenCalledWith('conn-1')
  })

  it('connection:test returns test result on success', async () => {
    vi.mocked(connectionManager.testConnection).mockResolvedValue({ success: true })

    const result = await handlers.get('connection:test')!(fakeEvent, testConfig)

    expect(connectionManager.testConnection).toHaveBeenCalledWith(testConfig)
    expect(result).toEqual({ success: true })
  })

  it('connection:test returns failure result with error message', async () => {
    vi.mocked(connectionManager.testConnection).mockResolvedValue({
      success: false,
      error: 'ECONNREFUSED',
    })

    const result = await handlers.get('connection:test')!(fakeEvent, testConfig)
    expect(result).toEqual({ success: false, error: 'ECONNREFUSED' })
  })

  it('connection:connect calls connect with id', async () => {
    vi.mocked(connectionManager.connect).mockResolvedValue(undefined)

    await handlers.get('connection:connect')!(fakeEvent, 'conn-1')

    expect(connectionManager.connect).toHaveBeenCalledWith('conn-1')
  })

  it('connection:disconnect calls disconnect with id', async () => {
    vi.mocked(connectionManager.disconnect).mockResolvedValue(undefined)

    await handlers.get('connection:disconnect')!(fakeEvent, 'conn-1')

    expect(connectionManager.disconnect).toHaveBeenCalledWith('conn-1')
  })

  it('connection:connect propagates errors', async () => {
    vi.mocked(connectionManager.connect).mockRejectedValueOnce(
      new Error('Connection conn-1 not found'),
    )

    await expect(handlers.get('connection:connect')!(fakeEvent, 'conn-1')).rejects.toThrow(
      'Connection conn-1 not found',
    )
  })
})
