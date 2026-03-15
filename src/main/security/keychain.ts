import { safeStorage } from 'electron'
import Store from 'electron-store'

interface KeychainStore {
  [key: string]: string // base64-encoded encrypted buffer
}

export class KeychainService {
  private store: Store<KeychainStore>

  constructor(serviceName: string) {
    this.store = new Store<KeychainStore>({ name: `keychain-${serviceName}` })
  }

  async setPassword(account: string, password: string): Promise<void> {
    if (!safeStorage.isEncryptionAvailable()) {
      throw new Error('safeStorage encryption is not available on this platform')
    }
    const encrypted = safeStorage.encryptString(password)
    this.store.set(account, encrypted.toString('base64'))
  }

  async getPassword(account: string): Promise<string | null> {
    const encoded = this.store.get(account)
    if (!encoded) return null
    if (!safeStorage.isEncryptionAvailable()) {
      throw new Error('safeStorage encryption is not available on this platform')
    }
    try {
      const buffer = Buffer.from(encoded, 'base64')
      return safeStorage.decryptString(buffer)
    } catch (err) {
      // Stored value is corrupted or from a different keychain — treat as missing
      console.error(`Failed to decrypt stored credential for account '${account}':`, err)
      return null
    }
  }

  async deletePassword(account: string): Promise<void> {
    this.store.delete(account)
  }
}

// Singleton for use across the app
export const keychain = new KeychainService('mai-sql')
