import { describe, it, expect, vi, beforeEach } from 'vitest'
import { PostgreSQLDriver } from '../postgresql'
import { DataSourceError } from '../interface'
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

async function getMockPool() {
  const { Pool } = await import('pg')
  return (Pool as any).mock.results[0].value
}

describe('PostgreSQLDriver', () => {
  let driver: PostgreSQLDriver

  beforeEach(async () => {
    vi.clearAllMocks()
    driver = new PostgreSQLDriver(testConfig)
    await driver.connect()
  })

  // ─── Lifecycle ──────────────────────────────────────────────────────────────

  it('returns postgresql dialect', () => {
    expect(driver.getDialect()).toBe('postgresql')
  })

  it('connect() creates a Pool and acquires a client', async () => {
    const { Pool } = await import('pg')
    const pool = (Pool as any).mock.results[0].value
    expect(pool.connect).toHaveBeenCalled()
  })

  it('connect() throws DataSourceError when pool.connect fails', async () => {
    // Create the driver first so Pool constructor is called and mock.results is populated
    const freshDriver = new PostgreSQLDriver(testConfig)
    const { Pool } = await import('pg')
    const pool = (Pool as any).mock.results[(Pool as any).mock.results.length - 1].value
    pool.connect.mockRejectedValueOnce(new Error('ECONNREFUSED'))

    await expect(freshDriver.connect()).rejects.toThrow(DataSourceError)
  })

  it('disconnect() ends the pool and nullifies it', async () => {
    const pool = await getMockPool()
    await driver.disconnect()
    expect(pool.end).toHaveBeenCalled()
    // Second disconnect should be a no-op (no error, pool already null)
    await expect(driver.disconnect()).resolves.toBeUndefined()
    expect(pool.end).toHaveBeenCalledTimes(1)
  })

  it('testConnection() runs SELECT 1', async () => {
    const pool = await getMockPool()
    const mockClient = { query: vi.fn().mockResolvedValue({}), release: vi.fn() }
    pool.connect.mockResolvedValueOnce(mockClient)

    const ok = await driver.testConnection()
    expect(ok).toBe(true)
    expect(mockClient.query).toHaveBeenCalledWith('SELECT 1')
    expect(mockClient.release).toHaveBeenCalled()
  })

  // ─── execute() ──────────────────────────────────────────────────────────────

  it('execute() wraps query result into QueryResult shape', async () => {
    const pool = await getMockPool()
    pool.query.mockResolvedValueOnce({
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
    expect(result.columns[1].name).toBe('name')
    expect(result.executionTimeMs).toBeGreaterThanOrEqual(0)
    expect(result.queryId).toBeDefined()
  })

  it('execute() passes params to pool.query', async () => {
    const pool = await getMockPool()
    pool.query.mockResolvedValueOnce({ rows: [], fields: [], rowCount: 0 })

    await driver.execute('SELECT * FROM t WHERE id = $1', [42])
    expect(pool.query).toHaveBeenCalledWith('SELECT * FROM t WHERE id = $1', [42])
  })

  it('execute() falls back to rows.length when rowCount is null', async () => {
    const pool = await getMockPool()
    pool.query.mockResolvedValueOnce({
      rows: [{ a: 1 }, { a: 2 }],
      fields: [{ name: 'a', dataTypeID: 23 }],
      rowCount: null,
    })

    const result = await driver.execute('SELECT a FROM t')
    expect(result.rowCount).toBe(2)
  })

  it('execute() throws DataSourceError on pg error', async () => {
    const pool = await getMockPool()
    pool.query.mockRejectedValueOnce(
      Object.assign(new Error('relation "users" does not exist'), { code: '42P01' }),
    )

    await expect(driver.execute('SELECT * FROM users')).rejects.toThrow(
      'relation "users" does not exist',
    )
    await expect(driver.execute('SELECT * FROM users')).rejects.toBeInstanceOf(DataSourceError)
  })

  it('execute() throws DataSourceError when pool is null (not connected)', async () => {
    const disconnectedDriver = new PostgreSQLDriver(testConfig)
    // Do NOT call connect()
    await expect(disconnectedDriver.execute('SELECT 1')).rejects.toThrow('Not connected')
  })

  // ─── getVersion() ────────────────────────────────────────────────────────────

  it('getVersion() returns the version string', async () => {
    const pool = await getMockPool()
    pool.query.mockResolvedValueOnce({
      rows: [{ version: 'PostgreSQL 16.0' }],
      fields: [{ name: 'version', dataTypeID: 25 }],
      rowCount: 1,
    })

    const version = await driver.getVersion()
    expect(version).toBe('PostgreSQL 16.0')
  })

  // ─── getDatabases() ──────────────────────────────────────────────────────────

  it('getDatabases() returns list of database names', async () => {
    const pool = await getMockPool()
    pool.query.mockResolvedValueOnce({
      rows: [{ datname: 'postgres' }, { datname: 'testdb' }],
      fields: [{ name: 'datname', dataTypeID: 19 }],
      rowCount: 2,
    })

    const dbs = await driver.getDatabases()
    expect(dbs).toEqual(['postgres', 'testdb'])
  })

  // ─── getSchemas() ────────────────────────────────────────────────────────────

  it('getSchemas() returns user schemas', async () => {
    const pool = await getMockPool()
    pool.query.mockResolvedValueOnce({
      rows: [{ schema_name: 'public' }, { schema_name: 'app' }],
      fields: [{ name: 'schema_name', dataTypeID: 19 }],
      rowCount: 2,
    })

    const schemas = await driver.getSchemas('testdb')
    expect(schemas).toEqual(['public', 'app'])
  })

  // ─── getTables() ─────────────────────────────────────────────────────────────

  it('getTables() returns tables and views', async () => {
    const pool = await getMockPool()
    pool.query.mockResolvedValueOnce({
      rows: [
        { table_name: 'users', table_type: 'BASE TABLE' },
        { table_name: 'active_users', table_type: 'VIEW' },
      ],
      fields: [
        { name: 'table_name', dataTypeID: 19 },
        { name: 'table_type', dataTypeID: 19 },
      ],
      rowCount: 2,
    })

    const tables = await driver.getTables('public')
    expect(tables).toHaveLength(2)
    expect(tables[0]).toEqual({ name: 'users', schema: 'public', type: 'table' })
    expect(tables[1]).toEqual({ name: 'active_users', schema: 'public', type: 'view' })
  })

  // ─── getColumns() ────────────────────────────────────────────────────────────

  it('getColumns() maps column metadata correctly', async () => {
    const pool = await getMockPool()
    pool.query.mockResolvedValueOnce({
      rows: [
        {
          column_name: 'id',
          data_type: 'integer',
          udt_name: 'int4',
          is_nullable: 'NO',
          column_default: null,
          character_maximum_length: null,
          numeric_precision: 32,
          numeric_scale: 0,
          is_pk: true,
          is_fk: false,
        },
        {
          column_name: 'email',
          data_type: 'character varying',
          udt_name: 'varchar',
          is_nullable: 'YES',
          column_default: null,
          character_maximum_length: 255,
          numeric_precision: null,
          numeric_scale: null,
          is_pk: false,
          is_fk: false,
        },
      ],
      fields: [],
      rowCount: 2,
    })

    const cols = await driver.getColumns('users', 'public')
    expect(cols).toHaveLength(2)

    expect(cols[0].name).toBe('id')
    expect(cols[0].isPrimaryKey).toBe(true)
    expect(cols[0].nullable).toBe(false)
    expect(cols[0].displayType).toBe('int4(32,0)')

    expect(cols[1].name).toBe('email')
    expect(cols[1].displayType).toBe('varchar(255)')
    expect(cols[1].nullable).toBe(true)
    expect(cols[1].maxLength).toBe(255)
  })

  it('getColumns() uses default schema "public" when not provided', async () => {
    const pool = await getMockPool()
    pool.query.mockResolvedValueOnce({ rows: [], fields: [], rowCount: 0 })

    await driver.getColumns('users')
    const [sql, params] = pool.query.mock.calls[0]
    expect(params).toEqual(['public', 'users'])
    expect(sql).toContain('table_schema = $1')
  })

  // ─── getRelationships() ──────────────────────────────────────────────────────

  it('getRelationships() returns foreign key relationships', async () => {
    const pool = await getMockPool()
    pool.query.mockResolvedValueOnce({
      rows: [
        {
          constraint_name: 'fk_order_user',
          source_table: 'orders',
          source_column: 'user_id',
          target_table: 'users',
          target_column: 'id',
        },
      ],
      fields: [],
      rowCount: 1,
    })

    const rels = await driver.getRelationships('public')
    expect(rels).toHaveLength(1)
    expect(rels[0]).toEqual({
      constraintName: 'fk_order_user',
      sourceTable: 'orders',
      sourceColumn: 'user_id',
      targetTable: 'users',
      targetColumn: 'id',
    })
  })

  // ─── getFunctions() ──────────────────────────────────────────────────────────

  it('getFunctions() returns functions and procedures', async () => {
    const pool = await getMockPool()
    pool.query.mockResolvedValueOnce({
      rows: [
        { name: 'get_user', return_type: 'record', language: 'plpgsql', kind: 'function' },
        { name: 'update_stats', return_type: 'void', language: 'plpgsql', kind: 'procedure' },
      ],
      fields: [],
      rowCount: 2,
    })

    const fns = await driver.getFunctions('public')
    expect(fns).toHaveLength(2)
    expect(fns[0].kind).toBe('function')
    expect(fns[1].kind).toBe('procedure')
    expect(fns[0].name).toBe('get_user')
    expect(fns[0].language).toBe('plpgsql')
  })

  // ─── getTriggers() ───────────────────────────────────────────────────────────

  it('getTriggers() collapses multi-event rows for same trigger', async () => {
    const pool = await getMockPool()
    pool.query.mockResolvedValueOnce({
      rows: [
        {
          trigger_name: 'audit_trigger',
          event_manipulation: 'INSERT',
          action_timing: 'AFTER',
          action_orientation: 'ROW',
        },
        {
          trigger_name: 'audit_trigger',
          event_manipulation: 'UPDATE',
          action_timing: 'AFTER',
          action_orientation: 'ROW',
        },
      ],
      fields: [],
      rowCount: 2,
    })

    const triggers = await driver.getTriggers('users', 'public')
    expect(triggers).toHaveLength(1)
    expect(triggers[0].name).toBe('audit_trigger')
    expect(triggers[0].event).toBe('INSERT/UPDATE')
    expect(triggers[0].timing).toBe('AFTER')
  })

  it('getTriggers() returns separate entries for different triggers', async () => {
    const pool = await getMockPool()
    pool.query.mockResolvedValueOnce({
      rows: [
        {
          trigger_name: 'trg_a',
          event_manipulation: 'INSERT',
          action_timing: 'BEFORE',
          action_orientation: 'ROW',
        },
        {
          trigger_name: 'trg_b',
          event_manipulation: 'DELETE',
          action_timing: 'AFTER',
          action_orientation: 'ROW',
        },
      ],
      fields: [],
      rowCount: 2,
    })

    const triggers = await driver.getTriggers('orders', 'public')
    expect(triggers).toHaveLength(2)
  })

  // ─── getIndexes() ────────────────────────────────────────────────────────────

  it('getIndexes() returns index info with columns array', async () => {
    const pool = await getMockPool()
    pool.query.mockResolvedValueOnce({
      rows: [
        {
          index_name: 'users_pkey',
          is_unique: true,
          is_primary: true,
          columns: ['id'],
        },
        {
          index_name: 'users_email_idx',
          is_unique: true,
          is_primary: false,
          columns: ['email'],
        },
      ],
      fields: [],
      rowCount: 2,
    })

    const indexes = await driver.getIndexes('users', 'public')
    expect(indexes).toHaveLength(2)
    expect(indexes[0].name).toBe('users_pkey')
    expect(indexes[0].isPrimary).toBe(true)
    expect(indexes[0].isUnique).toBe(true)
    expect(indexes[0].columns).toEqual(['id'])
  })

  it('getIndexes() handles string columns from pg array_agg', async () => {
    const pool = await getMockPool()
    pool.query.mockResolvedValueOnce({
      rows: [
        {
          index_name: 'composite_idx',
          is_unique: false,
          is_primary: false,
          columns: '{col_a,col_b}', // pg returns brace format for arrays
        },
      ],
      fields: [],
      rowCount: 1,
    })

    const indexes = await driver.getIndexes('orders', 'public')
    expect(indexes[0].columns).toEqual(['col_a', 'col_b'])
  })

  // ─── cancel() ────────────────────────────────────────────────────────────────

  it('cancel() is a no-op stub and resolves without error', async () => {
    await expect(driver.cancel('some-query-id')).resolves.toBeUndefined()
  })
})

// ─── buildDisplayType (tested via getColumns) ────────────────────────────────

describe('buildDisplayType (via getColumns)', () => {
  let driver: PostgreSQLDriver

  beforeEach(async () => {
    vi.clearAllMocks()
    driver = new PostgreSQLDriver(testConfig)
    await driver.connect()
  })

  async function getFirstColumn(row: Record<string, unknown>) {
    const { Pool } = await import('pg')
    const pool = (Pool as any).mock.results[0].value
    pool.query.mockResolvedValueOnce({ rows: [row], fields: [], rowCount: 1 })
    const cols = await driver.getColumns('t', 'public')
    return cols[0]
  }

  it('returns bare type name when no length, precision, or scale', async () => {
    const col = await getFirstColumn({
      column_name: 'flag',
      data_type: 'boolean',
      udt_name: 'bool',
      is_nullable: 'YES',
      column_default: null,
      character_maximum_length: null,
      numeric_precision: null,
      numeric_scale: null,
      is_pk: false,
      is_fk: false,
    })
    expect(col.displayType).toBe('bool')
  })

  it('appends max length when character_maximum_length is set', async () => {
    const col = await getFirstColumn({
      column_name: 'name',
      data_type: 'character varying',
      udt_name: 'varchar',
      is_nullable: 'NO',
      column_default: null,
      character_maximum_length: 100,
      numeric_precision: null,
      numeric_scale: null,
      is_pk: false,
      is_fk: false,
    })
    expect(col.displayType).toBe('varchar(100)')
  })

  it('appends precision and scale for numeric type', async () => {
    const col = await getFirstColumn({
      column_name: 'price',
      data_type: 'numeric',
      udt_name: 'numeric',
      is_nullable: 'NO',
      column_default: null,
      character_maximum_length: null,
      numeric_precision: 10,
      numeric_scale: 2,
      is_pk: false,
      is_fk: false,
    })
    expect(col.displayType).toBe('numeric(10,2)')
  })

  it('appends only precision when scale is null', async () => {
    const col = await getFirstColumn({
      column_name: 'qty',
      data_type: 'integer',
      udt_name: 'int4',
      is_nullable: 'NO',
      column_default: null,
      character_maximum_length: null,
      numeric_precision: 32,
      numeric_scale: null,
      is_pk: false,
      is_fk: false,
    })
    expect(col.displayType).toBe('int4(32)')
  })
})
