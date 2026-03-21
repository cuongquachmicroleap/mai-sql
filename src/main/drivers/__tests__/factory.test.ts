import { describe, it, expect } from 'vitest'
import { createDriver } from '../factory'
import { PostgreSQLDriver } from '../postgresql'
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

  it('throws for unsupported driver type', () => {
    expect(() =>
      createDriver({ ...baseConfig, type: 'mongodb' as any }),
    ).toThrow('Driver for mongodb not implemented yet')
  })

  it('throws for every unimplemented dialect', () => {
    const unsupported = ['mysql', 'mariadb', 'mongodb', 'clickhouse', 'mssql']
    for (const type of unsupported) {
      expect(() => createDriver({ ...baseConfig, type: type as any })).toThrow(
        `Driver for ${type} not implemented yet`,
      )
    }
  })
})
