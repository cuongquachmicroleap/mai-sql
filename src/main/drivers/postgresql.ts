import { Pool, type QueryResult as PGQueryResult } from 'pg'
import { nanoid } from 'nanoid'
import { DataSourceError, type IDataSource } from './interface'
import type { ConnectionConfig } from '../../shared/types/connection'
import type { QueryResult, ColumnMeta } from '../../shared/types/query'
import type { TableInfo, ColumnInfo, Relationship, IndexInfo, FunctionInfo, TriggerInfo } from '../../shared/types/schema'

function buildDisplayType(
  udtName: string,
  maxLen: number | null,
  precision: number | null,
  scale: number | null,
): string {
  if (maxLen != null) return `${udtName}(${maxLen})`
  if (precision != null && scale != null) return `${udtName}(${precision},${scale})`
  if (precision != null) return `${udtName}(${precision})`
  return udtName
}

export class PostgreSQLDriver implements IDataSource {
  private pools = new Map<string, Pool>()
  private defaultDatabase: string = 'postgres'

  constructor(private readonly config: ConnectionConfig) {}

  getDialect() {
    return 'postgresql' as const
  }

  supportsSchemas() {
    return true
  }

  async connect(): Promise<void> {
    try {
      this.defaultDatabase = this.config.database || 'postgres'
      const pool = new Pool({
        host: this.config.host,
        port: this.config.port,
        database: this.defaultDatabase,
        user: this.config.username,
        password: this.config.password,
        ssl: this.config.ssl ? { rejectUnauthorized: false } : false,
        max: 5,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 10000,
      })
      const client = await pool.connect()
      client.release()
      this.pools.set(this.defaultDatabase, pool)
    } catch (err) {
      throw new DataSourceError(`Failed to connect: ${(err as Error).message}`, undefined, err)
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
    // Create a new pool for this database on-demand
    const pool = new Pool({
      host: this.config.host,
      port: this.config.port,
      database: db,
      user: this.config.username,
      password: this.config.password,
      ssl: this.config.ssl ? { rejectUnauthorized: false } : false,
      max: 3,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    })
    const client = await pool.connect()
    client.release()
    this.pools.set(db, pool)
    return pool
  }

  async testConnection(): Promise<boolean> {
    const pool = await this.getPool()
    const client = await pool.connect()
    await client.query('SELECT 1')
    client.release()
    return true
  }

  async execute(query: string, params?: unknown[], database?: string): Promise<QueryResult> {
    if (this.pools.size === 0) throw new DataSourceError('Not connected')
    const pool = await this.getPool(database)
    const start = Date.now()
    const queryId = nanoid()
    try {
      const result: PGQueryResult = await pool.query(query, params)
      const columns: ColumnMeta[] = (result.fields ?? []).map((f) => ({
        name: f.name,
        dataType: String(f.dataTypeID),
      }))
      return {
        columns,
        rows: result.rows,
        rowCount: result.rowCount ?? result.rows.length,
        affectedRows: result.rowCount ?? undefined,
        executionTimeMs: Date.now() - start,
        queryId,
      }
    } catch (err) {
      throw new DataSourceError((err as Error).message, (err as any).code, err)
    }
  }

  async cancel(_queryId: string): Promise<void> {
    // PostgreSQL cancel via pg_cancel_backend — simplified for Sprint 1
  }

  async getVersion(): Promise<string> {
    const result = await this.execute('SELECT version()')
    return String(result.rows[0]?.version ?? 'unknown')
  }

  async getDatabases(): Promise<string[]> {
    const result = await this.execute(
      `SELECT datname FROM pg_database WHERE datistemplate = false ORDER BY datname`
    )
    return result.rows.map((r) => String(r['datname']))
  }

  getDefaultDatabase(): string {
    return this.defaultDatabase
  }

  async getSchemas(database?: string): Promise<string[]> {
    const result = await this.execute(
      `SELECT schema_name FROM information_schema.schemata
       WHERE schema_name NOT IN ('pg_catalog', 'information_schema', 'pg_toast', 'pg_temp_1', 'pg_toast_temp_1')
         AND schema_name NOT LIKE 'pg_%'
       ORDER BY schema_name`,
      undefined,
      database
    )
    return result.rows.map((r) => String(r['schema_name']))
  }

  async getTables(schema: string, database?: string): Promise<TableInfo[]> {
    const result = await this.execute(
      `SELECT table_name, table_type
       FROM information_schema.tables
       WHERE table_schema = $1
       ORDER BY table_name`,
      [schema],
      database
    )
    return result.rows.map((r) => ({
      name: String(r['table_name']),
      schema,
      type: r['table_type'] === 'VIEW' ? ('view' as const) : ('table' as const),
    }))
  }

  async getColumns(table: string, schema = 'public', database?: string): Promise<ColumnInfo[]> {
    const result = await this.execute(
      `SELECT
         c.column_name, c.data_type, c.udt_name, c.is_nullable, c.column_default,
         c.character_maximum_length, c.numeric_precision, c.numeric_scale,
         EXISTS (
           SELECT 1 FROM information_schema.table_constraints tc
           JOIN information_schema.key_column_usage kcu
             ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
           WHERE tc.constraint_type = 'PRIMARY KEY'
             AND tc.table_schema = c.table_schema AND tc.table_name = c.table_name AND kcu.column_name = c.column_name
         ) AS is_pk,
         EXISTS (
           SELECT 1 FROM information_schema.key_column_usage kcu2
           JOIN information_schema.table_constraints tc2
             ON kcu2.constraint_name = tc2.constraint_name AND kcu2.constraint_schema = tc2.constraint_schema
           WHERE tc2.constraint_type = 'FOREIGN KEY'
             AND tc2.table_schema = c.table_schema AND tc2.table_name = c.table_name AND kcu2.column_name = c.column_name
         ) AS is_fk
       FROM information_schema.columns c
       WHERE c.table_schema = $1 AND c.table_name = $2
       ORDER BY c.ordinal_position`,
      [schema, table],
      database
    )
    return result.rows.map((r) => {
      const type = String(r['data_type'])
      const udtName = String(r['udt_name'])
      const maxLen = r['character_maximum_length'] != null ? Number(r['character_maximum_length']) : null
      const precision = r['numeric_precision'] != null ? Number(r['numeric_precision']) : null
      const scale = r['numeric_scale'] != null ? Number(r['numeric_scale']) : null
      return {
        name: String(r['column_name']),
        type,
        displayType: buildDisplayType(udtName, maxLen, precision, scale),
        nullable: r['is_nullable'] === 'YES',
        defaultValue: r['column_default'] ? String(r['column_default']) : undefined,
        isPrimaryKey: r['is_pk'] === true,
        isForeignKey: r['is_fk'] === true,
        maxLength: maxLen ?? undefined,
        precision: precision ?? undefined,
        scale: scale ?? undefined,
      }
    })
  }

  async getRelationships(schema: string, database?: string): Promise<Relationship[]> {
    const result = await this.execute(
      `SELECT
         tc.constraint_name,
         kcu.table_name AS source_table,
         kcu.column_name AS source_column,
         ccu.table_name AS target_table,
         ccu.column_name AS target_column
       FROM information_schema.table_constraints tc
       JOIN information_schema.key_column_usage kcu
         ON tc.constraint_name = kcu.constraint_name AND tc.constraint_schema = kcu.constraint_schema
       JOIN information_schema.constraint_column_usage ccu
         ON ccu.constraint_name = tc.constraint_name AND ccu.constraint_schema = tc.constraint_schema
       WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.constraint_schema = $1`,
      [schema],
      database
    )
    return result.rows.map((r) => ({
      sourceTable: String(r['source_table']),
      sourceColumn: String(r['source_column']),
      targetTable: String(r['target_table']),
      targetColumn: String(r['target_column']),
      constraintName: String(r['constraint_name']),
    }))
  }

  async getFunctions(schema = 'public', database?: string): Promise<FunctionInfo[]> {
    const result = await this.execute(
      `SELECT p.proname AS name,
              pg_get_function_result(p.oid) AS return_type,
              l.lanname AS language,
              CASE p.prokind WHEN 'p' THEN 'procedure' ELSE 'function' END AS kind
       FROM pg_proc p
       JOIN pg_namespace n ON n.oid = p.pronamespace
       JOIN pg_language l ON l.oid = p.prolang
       WHERE n.nspname = $1
         AND p.prokind IN ('f', 'p')
       ORDER BY p.proname`,
      [schema],
      database
    )
    return result.rows.map((r) => ({
      name: String(r['name']),
      returnType: String(r['return_type'] ?? ''),
      language: String(r['language']),
      kind: r['kind'] === 'procedure' ? ('procedure' as const) : ('function' as const),
    }))
  }

  async getTriggers(table: string, schema: string, database?: string): Promise<TriggerInfo[]> {
    const result = await this.execute(
      `SELECT trigger_name, event_manipulation, action_timing, action_orientation
       FROM information_schema.triggers
       WHERE event_object_schema = $1 AND event_object_table = $2
       ORDER BY trigger_name, event_manipulation`,
      [schema, table],
      database
    )
    // Collapse multiple event rows for same trigger into one
    const map = new Map<string, TriggerInfo>()
    for (const r of result.rows) {
      const name = String(r['trigger_name'])
      if (map.has(name)) {
        map.get(name)!.event += `/${r['event_manipulation']}`
      } else {
        map.set(name, {
          name,
          event: String(r['event_manipulation']),
          timing: String(r['action_timing']),
          orientation: String(r['action_orientation']),
        })
      }
    }
    return Array.from(map.values())
  }

  async getIndexes(table: string, schema = 'public', database?: string): Promise<IndexInfo[]> {
    const result = await this.execute(
      `SELECT
         i.relname AS index_name,
         ix.indisunique AS is_unique,
         ix.indisprimary AS is_primary,
         array_agg(a.attname ORDER BY a.attnum) AS columns
       FROM pg_class t
       JOIN pg_index ix ON t.oid = ix.indrelid
       JOIN pg_class i ON i.oid = ix.indexrelid
       JOIN pg_namespace n ON t.relnamespace = n.oid
       JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY(ix.indkey)
       WHERE t.relname = $1 AND n.nspname = $2
       GROUP BY i.relname, ix.indisunique, ix.indisprimary`,
      [table, schema],
      database
    )
    return result.rows.map((r) => ({
      name: String(r['index_name']),
      columns: Array.isArray(r['columns']) ? r['columns'] : String(r['columns'] ?? '').replace(/[{}]/g, '').split(',').filter(Boolean),
      isUnique: Boolean(r['is_unique']),
      isPrimary: Boolean(r['is_primary']),
    }))
  }
}
