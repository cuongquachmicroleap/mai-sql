import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock electron-store
const mockStoreData = new Map<string, unknown>()
vi.mock('electron-store', () => ({
  default: vi.fn().mockImplementation(() => ({
    get: (key: string, def: unknown) => mockStoreData.get(key) ?? def,
    set: (key: string, val: unknown) => mockStoreData.set(key, val),
    delete: (key: string) => mockStoreData.delete(key),
  }))
}))

// Mock keychain
vi.mock('../../security/keychain', () => ({
  keychain: {
    setPassword: vi.fn().mockResolvedValue(undefined),
    getPassword: vi.fn().mockResolvedValue('testpass'),
    deletePassword: vi.fn().mockResolvedValue(undefined),
  }
}))

// Mock driver factory
vi.mock('../../drivers/factory', () => ({
  createDriver: vi.fn().mockReturnValue({
    connect: vi.fn().mockResolvedValue(undefined),
    disconnect: vi.fn().mockResolvedValue(undefined),
    testConnection: vi.fn().mockResolvedValue(true),
    getDialect: vi.fn().mockReturnValue('postgresql'),
  })
}))

import { ConnectionManager } from '../connection-manager'
import type { ConnectionConfig } from '../../../shared/types/connection'

const testConfig: ConnectionConfig = {
  id: 'conn-1',
  name: 'Local PG',
  type: 'postgresql',
  host: 'localhost',
  port: 5432,
  database: 'testdb',
  username: 'user',
  password: 'pass',
  ssl: false,
}

describe('ConnectionManager', () => {
  let manager: ConnectionManager

  beforeEach(() => {
    vi.clearAllMocks()
    mockStoreData.clear()
    manager = new ConnectionManager()
  })

  it('saves a connection without storing password in electron-store', async () => {
    await manager.saveConnection(testConfig)
    const saved = manager.listConnections()
    expect(saved).toHaveLength(1)
    expect(saved[0].id).toBe('conn-1')
    expect((saved[0] as any).password).toBeUndefined()
  })

  it('stores password in keychain on save', async () => {
    await manager.saveConnection(testConfig)
    const { keychain } = await import('../../security/keychain')
    expect(keychain.setPassword).toHaveBeenCalledWith('conn-conn-1', 'pass')
  })

  it('connects and tracks active driver', async () => {
    await manager.saveConnection(testConfig)
    await manager.connect('conn-1')
    expect(manager.getDriver('conn-1')).toBeDefined()
  })

  it('disconnect removes active driver', async () => {
    await manager.saveConnection(testConfig)
    await manager.connect('conn-1')
    await manager.disconnect('conn-1')
    expect(manager.getDriver('conn-1')).toBeUndefined()
  })

  it('deletes connection and removes from keychain', async () => {
    await manager.saveConnection(testConfig)
    await manager.deleteConnection('conn-1')
    expect(manager.listConnections()).toHaveLength(0)
    const { keychain } = await import('../../security/keychain')
    expect(keychain.deletePassword).toHaveBeenCalledWith('conn-conn-1')
  })

  it('testConnection returns success result', async () => {
    const result = await manager.testConnection(testConfig)
    expect(result.success).toBe(true)
  })
})
