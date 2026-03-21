import { describe, it, expectTypeOf } from 'vitest'
import type { ConnectionConfig, SavedConnection, SQLDialect, SSHTunnelConfig } from '../connection'

describe('ConnectionConfig types', () => {
  it('SQLDialect includes all 6 supported databases', () => {
    const dialects: SQLDialect[] = ['postgresql', 'mysql', 'mariadb', 'mongodb', 'clickhouse', 'mssql']
    expectTypeOf(dialects).toEqualTypeOf<SQLDialect[]>()
  })

  it('ConnectionConfig has required fields', () => {
    const config: ConnectionConfig = {
      id: 'test-id',
      name: 'Test DB',
      type: 'postgresql',
      host: 'localhost',
      port: 5432,
      database: 'testdb',
      username: 'user',
      password: 'pass',
    }
    expectTypeOf(config).toMatchTypeOf<ConnectionConfig>()
  })

  it('ConnectionConfig accepts optional ssl and sshTunnel', () => {
    const config: ConnectionConfig = {
      id: '1',
      name: 'With SSH',
      type: 'postgresql',
      host: 'db.example.com',
      port: 5432,
      database: 'prod',
      username: 'admin',
      password: 'secret',
      ssl: true,
      sshTunnel: {
        host: 'bastion.example.com',
        port: 22,
        username: 'ec2-user',
        privateKey: '-----BEGIN RSA PRIVATE KEY-----',
      },
    }
    expectTypeOf(config).toMatchTypeOf<ConnectionConfig>()
  })

  it('SavedConnection omits password', () => {
    // TypeScript will catch this at compile time — ensure the type excludes password
    const saved: SavedConnection = {
      id: '1',
      name: 'Local',
      type: 'postgresql',
      host: 'localhost',
      port: 5432,
      database: 'db',
      username: 'user',
      createdAt: '2024-01-01T00:00:00.000Z',
    }
    expectTypeOf(saved).toMatchTypeOf<SavedConnection>()
    // @ts-expect-error — password should not exist on SavedConnection
    const _: string = saved.password
  })

  it('SavedConnection accepts optional lastConnectedAt', () => {
    const saved: SavedConnection = {
      id: '1',
      name: 'Local',
      type: 'postgresql',
      host: 'localhost',
      port: 5432,
      database: 'db',
      username: 'user',
      createdAt: '2024-01-01T00:00:00.000Z',
      lastConnectedAt: '2024-06-01T12:00:00.000Z',
    }
    expectTypeOf(saved.lastConnectedAt).toEqualTypeOf<string | undefined>()
  })

  it('SSHTunnelConfig has required fields and optional password/privateKey', () => {
    const tunnel: SSHTunnelConfig = {
      host: 'bastion',
      port: 22,
      username: 'ec2-user',
    }
    expectTypeOf(tunnel).toMatchTypeOf<SSHTunnelConfig>()
    expectTypeOf(tunnel.privateKey).toEqualTypeOf<string | undefined>()
    expectTypeOf(tunnel.password).toEqualTypeOf<string | undefined>()
  })
})
