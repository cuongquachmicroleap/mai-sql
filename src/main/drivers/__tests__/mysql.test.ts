import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MySQLDriver } from '../mysql'
import { DataSourceError } from '../interface'
import type { ConnectionConfig } from '../../../shared/types/connection'

// ─── Mock mysql2/promise ──────────────────────────────────────────────────────

const mockConn = { query: vi.fn(), release: vi.fn() }
const mockPool = {
  getConnection: vi.fn().mockResolvedValue(mockConn),
  query: vi.fn(),
  end: vi.fn().mockResolvedValue(undefined),
}

vi.mock('mysql2/promise', () => ({
  default: {
    createPool: vi.fn(() => mockPool),
  },
}))

// ─── Helpers ─────────────────────────────────────────────────────────────────

const testConfig: ConnectionConfig = {
  id: 'test-mysql',
  name: 'Test MySQL',
  type: 'mysql',
  host: 'localhost',
  port: 3306,
  database: 'testdb',
  username: 'root',
  password: 'secret',
}

async function makeConnectedDriver(): Promise<MySQLDriver> {
  const driver = new MySQLDriver(testConfig)
  await driver.connect()
  return driver
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('MySQLDriver', () => {
  let driver: MySQLDriver

  beforeEach(async () => {
    vi.clearAllMocks()
    mockPool.getConnection.mockResolvedValue(mockConn)
    driver = await makeConnectedDriver()
  })

  // ─── Lifecycle ──────────────────────────────────────────────────────────

  it('returns mysql dialect', () => {
    expect(driver.getDialect()).toBe('mysql')
  })

  it('returns mariadb dialect for mariadb config', async () => {
    vi.clearAllMocks()
    mockPool.getConnection.mockResolvedValue(mockConn)
    const d = new MySQLDriver({ ...testConfig, type: 'mariadb' })
    await d.connect()
    expect(d.getDialect()).toBe('mariadb')
  })

  it('supportsSchemas() returns false', () => {
    expect(driver.supportsSchemas()).toBe(false)
  })

  it('connect() calls createPool and getConnection', async () => {
    const mysql = await import('mysql2/promise')
    expect(mysql.default.createPool).toHaveBeenCalled()
    expect(mockPool.getConnection).toHaveBeenCalled()
    expect(mockConn.release).toHaveBeenCalled()
  })

  it('connect() throws DataSourceError when getConnection fails', async () => {
    vi.clearAllMocks()
    mockPool.getConnection.mockRejectedValueOnce(new Error('ECONNREFUSED'))
    const d = new MySQLDriver(testConfig)
    await expect(d.connect()).rejects.toThrow(DataSourceError)
  })

  it('disconnect() ends all pools', async () => {
    await driver.disconnect()
    expect(mockPool.end).toHaveBeenCalled()
  })

  it('disconnect() twice is safe (no error on empty pools)', async () => {
    await driver.disconnect()
    await expect(driver.disconnect()).resolves.toBeUndefined()
  })

  it('testConnection() runs SELECT 1', async () => {
    const ok = await driver.testConnection()
    expect(ok).toBe(true)
    expect(mockConn.query).toHaveBeenCalledWith('SELECT 1')
    expect(mockConn.release).toHaveBeenCalled()
  })

  it('getDefaultDatabase() returns the configured database', () => {
    expect(driver.getDefaultDatabase()).toBe('testdb')
  })

  // ─── execute() ──────────────────────────────────────────────────────────

  it('execute() wraps SELECT result into QueryResult shape', async () => {
    const fields = [{ name: 'id', type: 3 }, { name: 'name', type: 253 }]
    const rows = [{ id: 1, name: 'Alice' }]
    mockPool.query.mockResolvedValueOnce([rows, fields])

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
    mockPool.query.mockResolvedValueOnce([[{ count: 5 }], [{ name: 'count', type: 3 }]])
    await driver.execute('SELECT COUNT(*) as count FROM t WHERE id = ?', [42])
    expect(mockPool.query).toHaveBeenCalledWith('SELECT COUNT(*) as count FROM t WHERE id = ?', [42])
  })

  it('execute() handles non-SELECT (INSERT/UPDATE/DELETE) ResultSetHeader', async () => {
    const header = { affectedRows: 3, fieldCount: 0, info: '', serverStatus: 2, warningStatus: 0 }
    mockPool.query.mockResolvedValueOnce([header, undefined])

    const result = await driver.execute('DELETE FROM users WHERE active = 0')
    expect(result.columns).toEqual([])
    expect(result.rows).toEqual([])
    expect(result.affectedRows).toBe(3)
    expect(result.rowCount).toBe(0)
  })

  it('execute() throws DataSourceError on mysql error', async () => {
    const err = Object.assign(new Error("Table 'testdb.missing' doesn't exist"), { code: '42S02' })
    mockPool.query.mockRejectedValueOnce(err)
    await expect(driver.execute("SELECT * FROM missing")).rejects.toBeInstanceOf(DataSourceError)
  })

  it('execute() DataSourceError preserves the original message', async () => {
    const err = Object.assign(new Error("Table 'testdb.missing' doesn't exist"), { code: '42S02' })
    mockPool.query.mockRejectedValueOnce(err)
    await expect(driver.execute("SELECT * FROM missing")).rejects.toThrow("Table 'testdb.missing' doesn't exist")
  })

  it('execute() throws DataSourceError when not connected', async () => {
    const d = new MySQLDriver(testConfig)
    // Do NOT call connect()
    await expect(d.execute('SELECT 1')).rejects.toThrow('Not connected')
    await expect(d.execute('SELECT 1')).rejects.toBeInstanceOf(DataSourceError)
  })

  it('cancel() is a no-op stub and resolves without error', async () => {
    await expect(driver.cancel('some-query-id')).resolves.toBeUndefined()
  })

  // ─── getVersion() ────────────────────────────────────────────────────────

  it('getVersion() returns version string', async () => {
    mockPool.query.mockResolvedValueOnce([[{ version: '8.0.32' }], [{ name: 'version', type: 253 }]])
    const version = await driver.getVersion()
    expect(version).toBe('8.0.32')
  })

  it('getVersion() returns "unknown" when version row is missing', async () => {
    mockPool.query.mockResolvedValueOnce([[{}], []])
    const version = await driver.getVersion()
    expect(version).toBe('unknown')
  })

  // ─── getDatabases() ──────────────────────────────────────────────────────

  it('getDatabases() parses SHOW DATABASES result', async () => {
    mockPool.query.mockResolvedValueOnce([
      [{ Database: 'mysql' }, { Database: 'testdb' }, { Database: 'information_schema' }],
      [],
    ])
    const dbs = await driver.getDatabases()
    expect(dbs).toEqual(['mysql', 'testdb', 'information_schema'])
  })

  it('getDatabases() handles lowercase "database" column', async () => {
    mockPool.query.mockResolvedValueOnce([
      [{ database: 'mydb' }],
      [],
    ])
    const dbs = await driver.getDatabases()
    expect(dbs).toEqual(['mydb'])
  })

  // ─── getSchemas() ────────────────────────────────────────────────────────

  it('getSchemas() returns ["default"] (MySQL has no schemas)', async () => {
    const schemas = await driver.getSchemas('testdb')
    expect(schemas).toEqual(['default'])
  })

  // ─── getTables() ─────────────────────────────────────────────────────────

  it('getTables() returns tables and views', async () => {
    mockPool.query.mockResolvedValueOnce([
      [
        { TABLE_NAME: 'users', TABLE_TYPE: 'BASE TABLE' },
        { TABLE_NAME: 'active_users', TABLE_TYPE: 'VIEW' },
      ],
      [],
    ])
    const tables = await driver.getTables('default')
    expect(tables).toHaveLength(2)
    expect(tables[0]).toEqual({ name: 'users', schema: 'testdb', type: 'table' })
    expect(tables[1]).toEqual({ name: 'active_users', schema: 'testdb', type: 'view' })
  })

  it('getTables() uses provided database arg', async () => {
    mockPool.query.mockResolvedValueOnce([[{ TABLE_NAME: 'orders', TABLE_TYPE: 'BASE TABLE' }], []])
    const tables = await driver.getTables('default', 'otherdb')
    expect(tables[0].schema).toBe('otherdb')
  })

  // ─── getColumns() ────────────────────────────────────────────────────────

  it('getColumns() maps column metadata correctly', async () => {
    mockPool.query.mockResolvedValueOnce([
      [
        {
          COLUMN_NAME: 'id',
          DATA_TYPE: 'int',
          COLUMN_TYPE: 'int(11)',
          IS_NULLABLE: 'NO',
          COLUMN_DEFAULT: null,
          CHARACTER_MAXIMUM_LENGTH: null,
          NUMERIC_PRECISION: 10,
          NUMERIC_SCALE: 0,
          COLUMN_KEY: 'PRI',
        },
        {
          COLUMN_NAME: 'email',
          DATA_TYPE: 'varchar',
          COLUMN_TYPE: 'varchar(255)',
          IS_NULLABLE: 'YES',
          COLUMN_DEFAULT: null,
          CHARACTER_MAXIMUM_LENGTH: 255,
          NUMERIC_PRECISION: null,
          NUMERIC_SCALE: null,
          COLUMN_KEY: '',
        },
      ],
      [],
    ])
    const cols = await driver.getColumns('users')
    expect(cols).toHaveLength(2)

    expect(cols[0].name).toBe('id')
    expect(cols[0].isPrimaryKey).toBe(true)
    expect(cols[0].isForeignKey).toBe(false)
    expect(cols[0].nullable).toBe(false)
    expect(cols[0].displayType).toBe('int(11)')

    expect(cols[1].name).toBe('email')
    expect(cols[1].nullable).toBe(true)
    expect(cols[1].maxLength).toBe(255)
    expect(cols[1].displayType).toBe('varchar(255)')
  })

  it('getColumns() marks MUL key as foreign key', async () => {
    mockPool.query.mockResolvedValueOnce([
      [
        {
          COLUMN_NAME: 'user_id',
          DATA_TYPE: 'int',
          COLUMN_TYPE: 'int(11)',
          IS_NULLABLE: 'NO',
          COLUMN_DEFAULT: null,
          CHARACTER_MAXIMUM_LENGTH: null,
          NUMERIC_PRECISION: 10,
          NUMERIC_SCALE: 0,
          COLUMN_KEY: 'MUL',
        },
      ],
      [],
    ])
    const cols = await driver.getColumns('orders')
    expect(cols[0].isForeignKey).toBe(true)
    expect(cols[0].isPrimaryKey).toBe(false)
  })

  it('getColumns() falls back to buildDisplayType when COLUMN_TYPE is empty', async () => {
    mockPool.query.mockResolvedValueOnce([
      [
        {
          COLUMN_NAME: 'price',
          DATA_TYPE: 'decimal',
          COLUMN_TYPE: '',
          IS_NULLABLE: 'NO',
          COLUMN_DEFAULT: null,
          CHARACTER_MAXIMUM_LENGTH: null,
          NUMERIC_PRECISION: 10,
          NUMERIC_SCALE: 2,
          COLUMN_KEY: '',
        },
      ],
      [],
    ])
    const cols = await driver.getColumns('products')
    expect(cols[0].displayType).toBe('decimal(10,2)')
  })

  // ─── getRelationships() ──────────────────────────────────────────────────

  it('getRelationships() returns foreign key relationships', async () => {
    mockPool.query.mockResolvedValueOnce([
      [
        {
          CONSTRAINT_NAME: 'fk_order_user',
          source_table: 'orders',
          source_column: 'user_id',
          target_table: 'users',
          target_column: 'id',
        },
      ],
      [],
    ])
    const rels = await driver.getRelationships('default')
    expect(rels).toHaveLength(1)
    expect(rels[0]).toEqual({
      constraintName: 'fk_order_user',
      sourceTable: 'orders',
      sourceColumn: 'user_id',
      targetTable: 'users',
      targetColumn: 'id',
    })
  })

  it('getRelationships() returns empty array when no FK constraints', async () => {
    mockPool.query.mockResolvedValueOnce([[], []])
    const rels = await driver.getRelationships('default')
    expect(rels).toEqual([])
  })

  // ─── getIndexes() ────────────────────────────────────────────────────────

  it('getIndexes() groups multi-column indexes', async () => {
    mockPool.query.mockResolvedValueOnce([
      [
        { INDEX_NAME: 'PRIMARY', NON_UNIQUE: 0, COLUMN_NAME: 'id', SEQ_IN_INDEX: 1 },
        { INDEX_NAME: 'name_email_idx', NON_UNIQUE: 1, COLUMN_NAME: 'last_name', SEQ_IN_INDEX: 1 },
        { INDEX_NAME: 'name_email_idx', NON_UNIQUE: 1, COLUMN_NAME: 'email', SEQ_IN_INDEX: 2 },
      ],
      [],
    ])
    const indexes = await driver.getIndexes('users')
    expect(indexes).toHaveLength(2)

    const primary = indexes.find((i) => i.name === 'PRIMARY')!
    expect(primary.isPrimary).toBe(true)
    expect(primary.isUnique).toBe(true)
    expect(primary.columns).toEqual(['id'])

    const composite = indexes.find((i) => i.name === 'name_email_idx')!
    expect(composite.isPrimary).toBe(false)
    expect(composite.isUnique).toBe(false)
    expect(composite.columns).toEqual(['last_name', 'email'])
  })

  it('getIndexes() returns empty array when table has no indexes', async () => {
    mockPool.query.mockResolvedValueOnce([[], []])
    const indexes = await driver.getIndexes('empty_table')
    expect(indexes).toEqual([])
  })

  // ─── getTriggers() ───────────────────────────────────────────────────────

  it('getTriggers() collapses multi-event rows for same trigger', async () => {
    mockPool.query.mockResolvedValueOnce([
      [
        { TRIGGER_NAME: 'audit_trg', EVENT_MANIPULATION: 'INSERT', ACTION_TIMING: 'AFTER', ACTION_ORIENTATION: 'ROW' },
        { TRIGGER_NAME: 'audit_trg', EVENT_MANIPULATION: 'UPDATE', ACTION_TIMING: 'AFTER', ACTION_ORIENTATION: 'ROW' },
      ],
      [],
    ])
    const triggers = await driver.getTriggers('users', 'default')
    expect(triggers).toHaveLength(1)
    expect(triggers[0].name).toBe('audit_trg')
    expect(triggers[0].event).toBe('INSERT/UPDATE')
    expect(triggers[0].timing).toBe('AFTER')
    expect(triggers[0].orientation).toBe('ROW')
  })

  it('getTriggers() returns separate entries for different triggers', async () => {
    mockPool.query.mockResolvedValueOnce([
      [
        { TRIGGER_NAME: 'trg_a', EVENT_MANIPULATION: 'INSERT', ACTION_TIMING: 'BEFORE', ACTION_ORIENTATION: 'ROW' },
        { TRIGGER_NAME: 'trg_b', EVENT_MANIPULATION: 'DELETE', ACTION_TIMING: 'AFTER', ACTION_ORIENTATION: 'ROW' },
      ],
      [],
    ])
    const triggers = await driver.getTriggers('orders', 'default')
    expect(triggers).toHaveLength(2)
    expect(triggers.map((t) => t.name)).toEqual(['trg_a', 'trg_b'])
  })

  it('getTriggers() returns empty array when no triggers', async () => {
    mockPool.query.mockResolvedValueOnce([[], []])
    const triggers = await driver.getTriggers('no_triggers', 'default')
    expect(triggers).toEqual([])
  })

  // ─── getFunctions() ──────────────────────────────────────────────────────

  it('getFunctions() returns functions and procedures', async () => {
    mockPool.query.mockResolvedValueOnce([
      [
        { ROUTINE_NAME: 'get_user', ROUTINE_TYPE: 'FUNCTION', DATA_TYPE: 'varchar', EXTERNAL_LANGUAGE: 'SQL' },
        { ROUTINE_NAME: 'update_stats', ROUTINE_TYPE: 'PROCEDURE', DATA_TYPE: '', EXTERNAL_LANGUAGE: null },
      ],
      [],
    ])
    const fns = await driver.getFunctions('default')
    expect(fns).toHaveLength(2)
    expect(fns[0]).toEqual({ name: 'get_user', returnType: 'varchar', language: 'SQL', kind: 'function' })
    expect(fns[1]).toEqual({ name: 'update_stats', returnType: '', language: 'SQL', kind: 'procedure' })
  })

  it('getFunctions() returns empty array when no routines', async () => {
    mockPool.query.mockResolvedValueOnce([[], []])
    const fns = await driver.getFunctions('default')
    expect(fns).toEqual([])
  })
})

// ─── buildDisplayType (via getColumns fallback) ───────────────────────────────

describe('MySQLDriver buildDisplayType fallback (via getColumns)', () => {
  let driver: MySQLDriver

  beforeEach(async () => {
    vi.clearAllMocks()
    mockPool.getConnection.mockResolvedValue(mockConn)
    driver = new MySQLDriver(testConfig)
    await driver.connect()
  })

  async function getFirstColumn(row: Record<string, unknown>) {
    mockPool.query.mockResolvedValueOnce([[row], []])
    const cols = await driver.getColumns('t')
    return cols[0]
  }

  it('returns bare type when no length, precision, or scale', async () => {
    const col = await getFirstColumn({
      COLUMN_NAME: 'flag', DATA_TYPE: 'tinyint', COLUMN_TYPE: '',
      IS_NULLABLE: 'YES', COLUMN_DEFAULT: null,
      CHARACTER_MAXIMUM_LENGTH: null, NUMERIC_PRECISION: null, NUMERIC_SCALE: null, COLUMN_KEY: '',
    })
    expect(col.displayType).toBe('tinyint')
  })

  it('appends max length when CHARACTER_MAXIMUM_LENGTH is set', async () => {
    const col = await getFirstColumn({
      COLUMN_NAME: 'name', DATA_TYPE: 'varchar', COLUMN_TYPE: '',
      IS_NULLABLE: 'NO', COLUMN_DEFAULT: null,
      CHARACTER_MAXIMUM_LENGTH: 100, NUMERIC_PRECISION: null, NUMERIC_SCALE: null, COLUMN_KEY: '',
    })
    expect(col.displayType).toBe('varchar(100)')
  })

  it('appends precision and scale for numeric type', async () => {
    const col = await getFirstColumn({
      COLUMN_NAME: 'price', DATA_TYPE: 'decimal', COLUMN_TYPE: '',
      IS_NULLABLE: 'NO', COLUMN_DEFAULT: null,
      CHARACTER_MAXIMUM_LENGTH: null, NUMERIC_PRECISION: 10, NUMERIC_SCALE: 2, COLUMN_KEY: '',
    })
    expect(col.displayType).toBe('decimal(10,2)')
  })

  it('appends only precision when scale is 0 (not > 0)', async () => {
    const col = await getFirstColumn({
      COLUMN_NAME: 'qty', DATA_TYPE: 'int', COLUMN_TYPE: '',
      IS_NULLABLE: 'NO', COLUMN_DEFAULT: null,
      CHARACTER_MAXIMUM_LENGTH: null, NUMERIC_PRECISION: 11, NUMERIC_SCALE: 0, COLUMN_KEY: '',
    })
    expect(col.displayType).toBe('int(11)')
  })
})
