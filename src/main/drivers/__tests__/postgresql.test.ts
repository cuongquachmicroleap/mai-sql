import { describe, it, expect, vi, beforeEach } from 'vitest'
import { PostgreSQLDriver } from '../postgresql'
import type { ConnectionConfig } from '../../../shared/types/connection'

// Mock the pg module
vi.mock('pg', () => {
  const mockPool = {
    connect: vi.fn().mockResolvedValue({ release: vi.fn() }),
    end: vi.fn().mockResolvedValue(undefined),
    query: vi.fn(),
  }
  return { Pool: vi.fn(() => mockPool) }
})

const testConfig: ConnectionConfig = {
  id: 'test-pg',
  name: 'Test PostgreSQL',
  type: 'postgresql',
  host: 'localhost',
  port: 5432,
  database: 'testdb',
  username: 'testuser',
  password: 'testpass',
}

describe('PostgreSQLDriver', () => {
  let driver: PostgreSQLDriver

  beforeEach(async () => {
    vi.clearAllMocks()
    driver = new PostgreSQLDriver(testConfig)
    await driver.connect()
  })

  it('returns postgresql dialect', () => {
    expect(driver.getDialect()).toBe('postgresql')
  })

  it('execute() wraps query result into QueryResult shape', async () => {
    const { Pool } = await import('pg')
    const mockPool = (Pool as any).mock.results[0].value
    mockPool.query.mockResolvedValueOnce({
      rows: [{ id: 1, name: 'Alice' }],
      fields: [
        { name: 'id', dataTypeID: 23 },
        { name: 'name', dataTypeID: 25 },
      ],
      rowCount: 1,
    })

    const result = await driver.execute('SELECT id, name FROM users')

    expect(result.rows).toHaveLength(1)
    expect(result.rows[0]).toEqual({ id: 1, name: 'Alice' })
    expect(result.rowCount).toBe(1)
    expect(result.columns).toHaveLength(2)
    expect(result.columns[0].name).toBe('id')
    expect(result.executionTimeMs).toBeGreaterThanOrEqual(0)
    expect(result.queryId).toBeDefined()
  })

  it('execute() throws DataSourceError on pg error', async () => {
    const { Pool } = await import('pg')
    const mockPool = (Pool as any).mock.results[0].value
    mockPool.query.mockRejectedValueOnce(Object.assign(new Error('relation "users" does not exist'), { code: '42P01' }))

    await expect(driver.execute('SELECT * FROM users')).rejects.toThrow('relation "users" does not exist')
  })

  it('getDatabases() returns list of database names', async () => {
    const { Pool } = await import('pg')
    const mockPool = (Pool as any).mock.results[0].value
    mockPool.query.mockResolvedValueOnce({
      rows: [{ datname: 'postgres' }, { datname: 'testdb' }],
      fields: [{ name: 'datname', dataTypeID: 19 }],
      rowCount: 2,
    })

    const dbs = await driver.getDatabases()
    expect(dbs).toEqual(['postgres', 'testdb'])
  })
})
