import { describe, it, expectTypeOf } from 'vitest'
import type { ConnectionConfig, SQLDialect } from '../connection'

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
      password: 'pass'
    }
    expectTypeOf(config).toMatchTypeOf<ConnectionConfig>()
  })
})
