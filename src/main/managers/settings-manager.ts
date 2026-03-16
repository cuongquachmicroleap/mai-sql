import Store from 'electron-store'

class SettingsManager {
  private store: Store

  constructor() {
    this.store = new Store({ name: 'settings' })
  }

  get(key: string): unknown {
    return this.store.get(key)
  }

  set(key: string, value: unknown): void {
    this.store.set(key, value)
  }
}

export const settingsManager = new SettingsManager()
