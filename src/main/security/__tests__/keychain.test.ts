import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock electron's safeStorage
vi.mock('electron', () => ({
  safeStorage: {
    isEncryptionAvailable: vi.fn().mockReturnValue(true),
    encryptString: vi.fn().mockImplementation((text: string) => Buffer.from(`encrypted:${text}`)),
    decryptString: vi.fn().mockImplementation((buf: Buffer) => buf.toString().replace('encrypted:', '')),
  },
  app: {
    getPath: vi.fn().mockReturnValue('/tmp/mai-sql-test'),
    isReady: vi.fn().mockReturnValue(true),
  }
}))

// Mock electron-store
vi.mock('electron-store', () => {
  const store = new Map<string, string>()
  return {
    default: vi.fn().mockImplementation(() => ({
      get: (key: string) => store.get(key),
      set: (key: string, val: string) => store.set(key, val),
      delete: (key: string) => store.delete(key),
      has: (key: string) => store.has(key),
    }))
  }
})

import { KeychainService } from '../keychain'

describe('KeychainService', () => {
  let keychain: KeychainService

  beforeEach(() => {
    vi.clearAllMocks()
    keychain = new KeychainService('test-service')
  })

  it('stores a password (encrypts before storing)', async () => {
    await keychain.setPassword('conn-1', 'mypassword')
    const { safeStorage } = await import('electron')
    expect(safeStorage.encryptString).toHaveBeenCalledWith('mypassword')
  })

  it('retrieves a stored password (decrypts)', async () => {
    await keychain.setPassword('conn-1', 'mypassword')
    const result = await keychain.getPassword('conn-1')
    expect(result).toBe('mypassword')
  })

  it('returns null for unknown account', async () => {
    const result = await keychain.getPassword('nonexistent')
    expect(result).toBeNull()
  })

  it('deletes a password', async () => {
    await keychain.setPassword('conn-1', 'mypassword')
    await keychain.deletePassword('conn-1')
    const result = await keychain.getPassword('conn-1')
    expect(result).toBeNull()
  })
})
