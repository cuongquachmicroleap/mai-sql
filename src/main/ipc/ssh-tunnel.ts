import { ipcMain } from 'electron'
import { sshManager } from '../managers/ssh-manager'

ipcMain.handle(
  'ssh:connect',
  async (
    _event,
    connectionId: string,
    config: {
      host: string
      port: number
      username: string
      password?: string
      privateKey?: string
      remoteHost: string
      remotePort: number
    }
  ) => {
    const localPort = await sshManager.connect(connectionId, config)
    return localPort
  }
)

ipcMain.handle('ssh:disconnect', async (_event, connectionId: string) => {
  await sshManager.disconnect(connectionId)
})
