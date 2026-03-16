export type SQLDialect = 'postgresql' | 'mysql' | 'mariadb' | 'mongodb' | 'clickhouse' | 'mssql'

export interface SSHTunnelConfig {
  host: string
  port: number
  username: string
  privateKey?: string
  password?: string
}

export interface ConnectionConfig {
  id: string
  name: string
  type: SQLDialect
  host: string
  port: number
  database?: string
  username: string
  password: string // retrieved from OS keychain at runtime; stored here only in-memory
  ssl?: boolean
  sshTunnel?: SSHTunnelConfig
  color?: string   // hex color for visual coding (e.g. '#EF4444' for production)
  group?: string   // group name (e.g. 'Production', 'Staging', 'Development')
}

export interface SavedConnection extends Omit<ConnectionConfig, 'password'> {
  // Password is never serialized — fetched from keychain on connect
  createdAt: string
  lastConnectedAt?: string
}
