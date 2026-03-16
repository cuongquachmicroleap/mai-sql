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
}

export interface SavedConnection extends Omit<ConnectionConfig, 'password'> {
  // Password is never serialized — fetched from keychain on connect
  createdAt: string
  lastConnectedAt?: string
}
