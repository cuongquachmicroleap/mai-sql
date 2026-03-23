import Store from 'electron-store'
import { createDriver } from '../drivers/factory'
import { keychain } from '../security/keychain'
import { sshManager } from './ssh-manager'
import type { IDataSource } from '../drivers/interface'
import type { ConnectionConfig, SavedConnection, SSHTunnelConfig } from '../../shared/types/connection'

interface StoreSchema {
  connections: SavedConnection[]
}

export class ConnectionManager {
  private store: Store<StoreSchema>
  private activeDrivers = new Map<string, IDataSource>()

  constructor() {
    this.store = new Store<StoreSchema>({ name: 'connections' })
  }

  listConnections(): SavedConnection[] {
    return this.store.get('connections', [])
  }

  async saveConnection(config: ConnectionConfig): Promise<void> {
    // Only update keychain if a non-empty password was provided (edit mode may omit it)
    if (config.password) {
      await keychain.setPassword(`conn-${config.id}`, config.password)
    }

    // Save everything except password to electron-store
    const { password: _password, ...rest } = config
    const saved: SavedConnection = {
      ...rest,
      createdAt: new Date().toISOString(),
    }

    const connections = this.listConnections()
    const idx = connections.findIndex((c) => c.id === config.id)
    if (idx >= 0) {
      connections[idx] = saved
    } else {
      connections.push(saved)
    }
    this.store.set('connections', connections)
  }

  async deleteConnection(id: string): Promise<void> {
    await this.disconnect(id)
    await keychain.deletePassword(`conn-${id}`)
    const connections = this.listConnections().filter((c) => c.id !== id)
    this.store.set('connections', connections)
  }

  async testConnection(config: ConnectionConfig): Promise<{ success: boolean; error?: string }> {
    const driver = createDriver(config)
    let connected = false
    try {
      await driver.connect()
      connected = true
      const ok = await driver.testConnection()
      return { success: ok }
    } catch (err) {
      return { success: false, error: (err as Error).message }
    } finally {
      if (connected) {
        await driver.disconnect().catch(() => {/* ignore disconnect errors */})
      }
    }
  }

  async connect(id: string): Promise<void> {
    if (this.activeDrivers.has(id)) return // already connected

    const saved = this.listConnections().find((c) => c.id === id)
    if (!saved) throw new Error(`Connection ${id} not found`)

    const password = await keychain.getPassword(`conn-${id}`)
    if (!password) throw new Error(`No stored password for connection ${id}`)

    let config: ConnectionConfig = { ...saved, password }

    // If an SSH tunnel is configured, establish it and rewrite host/port
    if (saved.sshTunnel) {
      const tunnel: SSHTunnelConfig = saved.sshTunnel
      const localPort = await sshManager.connect(id, {
        host: tunnel.host,
        port: tunnel.port,
        username: tunnel.username,
        password: tunnel.password,
        privateKey: tunnel.privateKey,
        remoteHost: saved.host,
        remotePort: saved.port,
      })
      config = { ...config, host: '127.0.0.1', port: localPort }
    }

    const driver = createDriver(config)
    await driver.connect()
    this.activeDrivers.set(id, driver)
  }

  async disconnect(id: string): Promise<void> {
    const driver = this.activeDrivers.get(id)
    if (driver) {
      await driver.disconnect()
      this.activeDrivers.delete(id)
    }
    await sshManager.disconnect(id)
  }

  getDriver(id: string): IDataSource | undefined {
    return this.activeDrivers.get(id)
  }
}

// Singleton shared across all IPC handlers
export const connectionManager = new ConnectionManager()
