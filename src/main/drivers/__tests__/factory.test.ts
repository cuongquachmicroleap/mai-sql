import { describe, it, expect, vi } from 'vitest'

vi.mock('mysql2/promise', () => ({
  default: { createPool: vi.fn(() => ({ getConnection: vi.fn().mockResolvedValue({ release: vi.fn() }), end: vi.fn() })) },
}))

vi.mock('pg', () => ({
  Pool: vi.fn(() => ({ connect: vi.fn().mockResolvedValue({ release: vi.fn() }), end: vi.fn(), query: vi.fn() })),
}))

import { createDriver } from '../factory'
import { PostgreSQLDriver } from '../postgresql'
import { MySQLDriver } from '../mysql'
import type { ConnectionConfig } from '../../../shared/types/connection'

const baseConfig: Omit<ConnectionConfig, 'type'> = {
  id: 'test',
  name: 'test',
  host: 'localhost',
  port: 5432,
  database: 'db',
  username: 'user',
  password: 'pass',
}

describe('createDriver', () => {
  it('returns PostgreSQLDriver for postgresql type', () => {
    const driver = createDriver({ ...baseConfig, type: 'postgresql' })
    expect(driver).toBeInstanceOf(PostgreSQLDriver)
    expect(driver.getDialect()).toBe('postgresql')
  })

  it('returns MySQLDriver for mysql type', () => {
    const driver = createDriver({ ...baseConfig, type: 'mysql' })
    expect(driver).toBeInstanceOf(MySQLDriver)
    expect(driver.getDialect()).toBe('mysql')
  })

  it('returns MySQLDriver for mariadb type', () => {
    const driver = createDriver({ ...baseConfig, type: 'mariadb' })
    expect(driver).toBeInstanceOf(MySQLDriver)
    expect(driver.getDialect()).toBe('mariadb')
  })

  it('throws for unsupported driver type', () => {
    expect(() =>
      createDriver({ ...baseConfig, type: 'mongodb' as any }),
    ).toThrow('Driver for mongodb not implemented yet')
  })

  it('throws for every unimplemented dialect', () => {
    const unsupported = ['mongodb', 'clickhouse', 'mssql']
    for (const type of unsupported) {
      expect(() => createDriver({ ...baseConfig, type: type as any })).toThrow(
        `Driver for ${type} not implemented yet`,
      )
    }
  })
})
