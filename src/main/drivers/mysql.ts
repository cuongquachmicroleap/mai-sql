import mysql from 'mysql2/promise'
import type { Pool, FieldPacket } from 'mysql2/promise'
import { nanoid } from 'nanoid'
import { DataSourceError, type IDataSource } from './interface'
import type { ConnectionConfig } from '../../shared/types/connection'
import type { QueryResult, ColumnMeta } from '../../shared/types/query'
import type {
  TableInfo,
  ColumnInfo,
  Relationship,
  IndexInfo,
  FunctionInfo,
  TriggerInfo,
} from '../../shared/types/schema'

function buildDisplayType(
  dataType: string,
  maxLen: number | null,
  precision: number | null,
  scale: number | null,
): string {
  if (maxLen != null) return `${dataType}(${maxLen})`
  if (precision != null && scale != null && scale > 0) return `${dataType}(${precision},${scale})`
  if (precision != null) return `${dataType}(${precision})`
  return dataType
}

export class MySQLDriver implements IDataSource {
  private pools = new Map<string, Pool>()
  private defaultDatabase: string = 'mysql'

  constructor(private readonly config: ConnectionConfig) {}

  getDialect() {
    return this.config.type as 'mysql' | 'mariadb'
  }

  async connect(): Promise<void> {
    try {
      this.defaultDatabase = this.config.database || 'mysql'
      const pool = mysql.createPool({
        host: this.config.host,
        port: this.config.port,
        database: this.defaultDatabase,
        user: this.config.username,
        password: this.config.password,
        ssl: this.config.ssl ? { rejectUnauthorized: false } : undefined,
        connectionLimit: 5,
        connectTimeout: 10000,
        waitForConnections: true,
      })
      // Verify the connection works
      const conn = await pool.getConnection()
      conn.release()
      this.pools.set(this.defaultDatabase, pool)
    } catch (err) {
      throw new DataSourceError(
        `Failed to connect: ${(err as Error).message}`,
        undefined,
        err,
      )
    }
  }

  async disconnect(): Promise<void> {
    for (const pool of this.pools.values()) {
      await pool.end()
    }
    this.pools.clear()
  }

  private async getPool(database?: string): Promise<Pool> {
    const db = database || this.defaultDatabase
    const existing = this.pools.get(db)
    if (existing) return existing

    const pool = mysql.createPool({
      host: this.config.host,
      port: this.config.port,
      database: db,
      user: this.config.username,
      password: this.config.password,
      ssl: this.config.ssl ? { rejectUnauthorized: false } : undefined,
      connectionLimit: 3,
      connectTimeout: 10000,
      waitForConnections: true,
    })
    // Verify the connection works
    const conn = await pool.getConnection()
    conn.release()
    this.pools.set(db, pool)
    return pool
  }

  async testConnection(): Promise<boolean> {
    const pool = await this.getPool()
    const conn = await pool.getConnection()
    await conn.query('SELECT 1')
    conn.release()
    return true
  }

  async execute(
    query: string,
    params?: unknown[],
    database?: string,
  ): Promise<QueryResult> {
    if (this.pools.size === 0) throw new DataSourceError('Not connected')
    const pool = await this.getPool(database)
    const start = Date.now()
    const queryId = nanoid()
    try {
      const [rows, fields] = await pool.query(query, params)

      // For non-SELECT statements (INSERT, UPDATE, DELETE, etc.) rows is a ResultSetHeader
      if (!Array.isArray(rows)) {
        const header = rows as mysql.ResultSetHeader
        return {
          columns: [],
          rows: [],
          rowCount: 0,
          affectedRows: header.affectedRows ?? undefined,
          executionTimeMs: Date.now() - start,
          queryId,
        }
      }

      const columns: ColumnMeta[] = ((fields as FieldPacket[]) ?? []).map((f) => ({
        name: f.name,
        dataType: String(f.type ?? ''),
      }))

      const resultRows = rows as Record<string, unknown>[]
      return {
        columns,
        rows: resultRows,
        rowCount: resultRows.length,
        affectedRows: resultRows.length,
        executionTimeMs: Date.now() - start,
        queryId,
      }
    } catch (err) {
      throw new DataSourceError(
        (err as Error).message,
        (err as any).code,
        err,
      )
    }
  }

  async cancel(_queryId: string): Promise<void> {
    // MySQL cancel via KILL QUERY — stub for now
  }

  async getVersion(): Promise<string> {
    const result = await this.execute('SELECT VERSION() AS version')
    return String(result.rows[0]?.version ?? 'unknown')
  }

  async getDatabases(): Promise<string[]> {
    const result = await this.execute('SHOW DATABASES')
    return result.rows.map((r) => {
      // SHOW DATABASES returns a column named 'Database'
      const val = r['Database'] ?? r['database'] ?? Object.values(r)[0]
      return String(val)
    })
  }

  getDefaultDatabase(): string {
    return this.defaultDatabase
  }

  async getSchemas(_database?: string): Promise<string[]> {
    // MySQL does not have schemas in the PostgreSQL sense.
    // Databases act as schemas, so return a single 'default' placeholder.
    return ['default']
  }

  async getTables(_schema: string, database?: string): Promise<TableInfo[]> {
    const db = database || this.defaultDatabase
    const result = await this.execute(
      `SELECT TABLE_NAME, TABLE_TYPE
       FROM information_schema.TABLES
       WHERE TABLE_SCHEMA = ?
       ORDER BY TABLE_NAME`,
      [db],
      database,
    )
    return result.rows.map((r) => ({
      name: String(r['TABLE_NAME']),
      schema: db,
      type: String(r['TABLE_TYPE']).includes('VIEW')
        ? ('view' as const)
        : ('table' as const),
    }))
  }

  async getColumns(
    table: string,
    _schema?: string,
    database?: string,
  ): Promise<ColumnInfo[]> {
    const db = database || this.defaultDatabase
    const result = await this.execute(
      `SELECT
         c.COLUMN_NAME,
         c.DATA_TYPE,
         c.COLUMN_TYPE,
         c.IS_NULLABLE,
         c.COLUMN_DEFAULT,
         c.CHARACTER_MAXIMUM_LENGTH,
         c.NUMERIC_PRECISION,
         c.NUMERIC_SCALE,
         c.COLUMN_KEY
       FROM information_schema.COLUMNS c
       WHERE c.TABLE_SCHEMA = ? AND c.TABLE_NAME = ?
       ORDER BY c.ORDINAL_POSITION`,
      [db, table],
      database,
    )
    return result.rows.map((r) => {
      const dataType = String(r['DATA_TYPE'])
      const columnType = String(r['COLUMN_TYPE'])
      const maxLen =
        r['CHARACTER_MAXIMUM_LENGTH'] != null
          ? Number(r['CHARACTER_MAXIMUM_LENGTH'])
          : null
      const precision =
        r['NUMERIC_PRECISION'] != null
          ? Number(r['NUMERIC_PRECISION'])
          : null
      const scale =
        r['NUMERIC_SCALE'] != null ? Number(r['NUMERIC_SCALE']) : null
      const columnKey = String(r['COLUMN_KEY'] ?? '')

      return {
        name: String(r['COLUMN_NAME']),
        type: dataType,
        displayType: columnType || buildDisplayType(dataType, maxLen, precision, scale),
        nullable: r['IS_NULLABLE'] === 'YES',
        defaultValue:
          r['COLUMN_DEFAULT'] != null
            ? String(r['COLUMN_DEFAULT'])
            : undefined,
        isPrimaryKey: columnKey === 'PRI',
        isForeignKey: columnKey === 'MUL',
        maxLength: maxLen ?? undefined,
        precision: precision ?? undefined,
        scale: scale ?? undefined,
      }
    })
  }

  async getRelationships(
    _schema: string,
    database?: string,
  ): Promise<Relationship[]> {
    const db = database || this.defaultDatabase
    const result = await this.execute(
      `SELECT
         kcu.CONSTRAINT_NAME,
         kcu.TABLE_NAME AS source_table,
         kcu.COLUMN_NAME AS source_column,
         kcu.REFERENCED_TABLE_NAME AS target_table,
         kcu.REFERENCED_COLUMN_NAME AS target_column
       FROM information_schema.KEY_COLUMN_USAGE kcu
       WHERE kcu.TABLE_SCHEMA = ?
         AND kcu.REFERENCED_TABLE_NAME IS NOT NULL
       ORDER BY kcu.CONSTRAINT_NAME, kcu.ORDINAL_POSITION`,
      [db],
      database,
    )
    return result.rows.map((r) => ({
      sourceTable: String(r['source_table']),
      sourceColumn: String(r['source_column']),
      targetTable: String(r['target_table']),
      targetColumn: String(r['target_column']),
      constraintName: String(r['CONSTRAINT_NAME']),
    }))
  }

  async getIndexes(
    table: string,
    _schema?: string,
    database?: string,
  ): Promise<IndexInfo[]> {
    const db = database || this.defaultDatabase
    const result = await this.execute(
      `SELECT
         INDEX_NAME,
         NON_UNIQUE,
         COLUMN_NAME,
         SEQ_IN_INDEX
       FROM information_schema.STATISTICS
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?
       ORDER BY INDEX_NAME, SEQ_IN_INDEX`,
      [db, table],
      database,
    )

    // Group columns by index name
    const map = new Map<
      string,
      { columns: string[]; isUnique: boolean; isPrimary: boolean }
    >()
    for (const r of result.rows) {
      const name = String(r['INDEX_NAME'])
      if (!map.has(name)) {
        map.set(name, {
          columns: [],
          isUnique: Number(r['NON_UNIQUE']) === 0,
          isPrimary: name === 'PRIMARY',
        })
      }
      map.get(name)!.columns.push(String(r['COLUMN_NAME']))
    }

    return Array.from(map.entries()).map(([name, info]) => ({
      name,
      columns: info.columns,
      isUnique: info.isUnique,
      isPrimary: info.isPrimary,
    }))
  }

  async getTriggers(
    table: string,
    _schema: string,
    database?: string,
  ): Promise<TriggerInfo[]> {
    const db = database || this.defaultDatabase
    const result = await this.execute(
      `SELECT
         TRIGGER_NAME,
         EVENT_MANIPULATION,
         ACTION_TIMING,
         ACTION_ORIENTATION
       FROM information_schema.TRIGGERS
       WHERE EVENT_OBJECT_SCHEMA = ? AND EVENT_OBJECT_TABLE = ?
       ORDER BY TRIGGER_NAME, EVENT_MANIPULATION`,
      [db, table],
      database,
    )

    // Collapse multiple event rows for same trigger into one
    const map = new Map<string, TriggerInfo>()
    for (const r of result.rows) {
      const name = String(r['TRIGGER_NAME'])
      if (map.has(name)) {
        map.get(name)!.event += `/${r['EVENT_MANIPULATION']}`
      } else {
        map.set(name, {
          name,
          event: String(r['EVENT_MANIPULATION']),
          timing: String(r['ACTION_TIMING']),
          orientation: String(r['ACTION_ORIENTATION']),
        })
      }
    }
    return Array.from(map.values())
  }

  async getFunctions(
    _schema?: string,
    database?: string,
  ): Promise<FunctionInfo[]> {
    const db = database || this.defaultDatabase
    const result = await this.execute(
      `SELECT
         ROUTINE_NAME,
         ROUTINE_TYPE,
         DATA_TYPE,
         EXTERNAL_LANGUAGE
       FROM information_schema.ROUTINES
       WHERE ROUTINE_SCHEMA = ?
       ORDER BY ROUTINE_NAME`,
      [db],
      database,
    )
    return result.rows.map((r) => ({
      name: String(r['ROUTINE_NAME']),
      returnType: String(r['DATA_TYPE'] ?? ''),
      language: String(r['EXTERNAL_LANGUAGE'] ?? 'SQL'),
      kind:
        String(r['ROUTINE_TYPE']).toUpperCase() === 'PROCEDURE'
          ? ('procedure' as const)
          : ('function' as const),
    }))
  }
}
