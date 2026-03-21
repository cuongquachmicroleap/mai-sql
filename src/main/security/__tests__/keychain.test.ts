import { describe, it, expect, vi, beforeEach } from 'vitest'

// ─── Mock safeStorage — use vi.hoisted so refs are safe across hoisting ───────
const { mockIsEncryptionAvailable, mockEncryptString, mockDecryptString } = vi.hoisted(() => ({
  mockIsEncryptionAvailable: vi.fn().mockReturnValue(true),
  mockEncryptString: vi.fn().mockImplementation((text: string) => Buffer.from(`encrypted:${text}`)),
  mockDecryptString: vi.fn().mockImplementation((buf: Buffer) => buf.toString().replace('encrypted:', '')),
}))

vi.mock('electron', () => ({
  safeStorage: {
    isEncryptionAvailable: mockIsEncryptionAvailable,
    encryptString: mockEncryptString,
    decryptString: mockDecryptString,
  },
  app: {
    getPath: vi.fn().mockReturnValue('/tmp/mai-sql-test'),
    isReady: vi.fn().mockReturnValue(true),
  },
}))

// ─── Mock electron-store ─────────────────────────────────────────────────────
const mockStoreData = new Map<string, string>()

vi.mock('electron-store', () => ({
  default: vi.fn().mockImplementation(() => ({
    get: (key: string) => mockStoreData.get(key),
    set: (key: string, val: string) => mockStoreData.set(key, val),
    delete: (key: string) => mockStoreData.delete(key),
    has: (key: string) => mockStoreData.has(key),
  })),
}))

import { KeychainService } from '../keychain'

describe('KeychainService', () => {
  let keychain: KeychainService

  beforeEach(() => {
    vi.clearAllMocks()
    mockStoreData.clear()
    mockIsEncryptionAvailable.mockReturnValue(true)
    mockEncryptString.mockImplementation((text: string) => Buffer.from(`encrypted:${text}`))
    mockDecryptString.mockImplementation((buf: Buffer) => buf.toString().replace('encrypted:', ''))
    keychain = new KeychainService('test-service')
  })

  // ─── setPassword ───────────────────────────────────────────────────────────

  it('encrypts password and stores base64 in electron-store', async () => {
    await keychain.setPassword('conn-1', 'mypassword')
    expect(mockEncryptString).toHaveBeenCalledWith('mypassword')
    const stored = mockStoreData.get('conn-1')
    expect(stored).toBe(Buffer.from('encrypted:mypassword').toString('base64'))
  })

  it('throws when encryption is unavailable on setPassword', async () => {
    mockIsEncryptionAvailable.mockReturnValue(false)
    await expect(keychain.setPassword('conn-1', 'pass')).rejects.toThrow(
      'safeStorage encryption is not available on this platform',
    )
    expect(mockEncryptString).not.toHaveBeenCalled()
  })

  // ─── getPassword ───────────────────────────────────────────────────────────

  it('retrieves and decrypts a stored password', async () => {
    await keychain.setPassword('conn-1', 'mypassword')
    const result = await keychain.getPassword('conn-1')
    expect(result).toBe('mypassword')
  })

  it('returns null for unknown account', async () => {
    const result = await keychain.getPassword('nonexistent')
    expect(result).toBeNull()
  })

  it('throws when encryption is unavailable on getPassword', async () => {
    mockStoreData.set('conn-1', 'someval')
    mockIsEncryptionAvailable.mockReturnValue(false)
    await expect(keychain.getPassword('conn-1')).rejects.toThrow(
      'safeStorage encryption is not available on this platform',
    )
  })

  it('returns null when decryptString throws (corrupted credential)', async () => {
    mockStoreData.set('bad-account', 'corrupted-base64')
    mockDecryptString.mockImplementation(() => {
      throw new Error('decryption failure')
    })
    const result = await keychain.getPassword('bad-account')
    expect(result).toBeNull()
  })

  // ─── deletePassword ────────────────────────────────────────────────────────

  it('removes the account from the store', async () => {
    await keychain.setPassword('conn-1', 'mypassword')
    await keychain.deletePassword('conn-1')
    const result = await keychain.getPassword('conn-1')
    expect(result).toBeNull()
  })

  it('does not throw when deleting a non-existent account', async () => {
    await expect(keychain.deletePassword('ghost')).resolves.toBeUndefined()
  })
})
