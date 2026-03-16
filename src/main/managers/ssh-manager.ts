import { Client } from 'ssh2'
import net from 'net'

interface SSHTunnelEntry {
  sshClient: Client
  server: net.Server
  localPort: number
}

interface SSHTunnelConnectConfig {
  host: string
  port: number
  username: string
  password?: string
  privateKey?: string
  remoteHost: string
  remotePort: number
}

class SSHManager {
  private tunnels = new Map<string, SSHTunnelEntry>()

  /**
   * Establish an SSH tunnel for the given connection ID.
   * Returns the local port that forwards traffic to remoteHost:remotePort through the SSH tunnel.
   */
  async connect(connectionId: string, config: SSHTunnelConnectConfig): Promise<number> {
    // If a tunnel already exists for this connection, return its port
    const existing = this.tunnels.get(connectionId)
    if (existing) return existing.localPort

    return new Promise<number>((resolve, reject) => {
      const sshClient = new Client()

      sshClient.on('ready', () => {
        // Create a local TCP server that forwards connections through the SSH tunnel
        const server = net.createServer((socket) => {
          sshClient.forwardOut(
            '127.0.0.1',
            0,
            config.remoteHost,
            config.remotePort,
            (err, stream) => {
              if (err) {
                socket.destroy()
                return
              }
              socket.pipe(stream).pipe(socket)

              socket.on('error', () => stream.destroy())
              stream.on('error', () => socket.destroy())
            }
          )
        })

        server.on('error', (err) => {
          sshClient.end()
          reject(new Error(`SSH tunnel server error: ${err.message}`))
        })

        server.listen(0, '127.0.0.1', () => {
          const addr = server.address() as net.AddressInfo
          const localPort = addr.port

          this.tunnels.set(connectionId, { sshClient, server, localPort })
          resolve(localPort)
        })
      })

      sshClient.on('error', (err) => {
        reject(new Error(`SSH connection failed: ${err.message}`))
      })

      sshClient.connect({
        host: config.host,
        port: config.port,
        username: config.username,
        password: config.password,
        privateKey: config.privateKey,
      })
    })
  }

  /**
   * Tear down the SSH tunnel for the given connection ID.
   */
  async disconnect(connectionId: string): Promise<void> {
    const entry = this.tunnels.get(connectionId)
    if (!entry) return

    this.tunnels.delete(connectionId)

    return new Promise<void>((resolve) => {
      entry.server.close(() => {
        entry.sshClient.end()
        resolve()
      })
    })
  }

  /**
   * Tear down all active SSH tunnels.
   */
  async disconnectAll(): Promise<void> {
    const ids = Array.from(this.tunnels.keys())
    await Promise.all(ids.map((id) => this.disconnect(id)))
  }
}

// Singleton shared across all IPC handlers
export const sshManager = new SSHManager()
