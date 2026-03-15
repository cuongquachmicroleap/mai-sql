import { Pool, type QueryResult as PGQueryResult } from 'pg'
import { nanoid } from 'nanoid'
import { DataSourceError, type IDataSource } from './interface'
import type { ConnectionConfig } from '../../shared/types/connection'
import type { QueryResult, ColumnMeta } from '../../shared/types/query'
import type { TableInfo, ColumnInfo, Relationship, IndexInfo } from '../../shared/types/schema'

export class PostgreSQLDriver implements IDataSource {
  private pool: Pool | null = null

  constructor(private readonly config: ConnectionConfig) {}

  getDialect() {
    return 'postgresql' as const
  }

  async connect(): Promise<void> {
    try {
      this.pool = new Pool({
        host: this.config.host,
        port: this.config.port,
        database: this.config.database,
        user: this.config.username,
        password: this.config.password,
        ssl: this.config.ssl ? { rejectUnauthorized: false } : false,
        max: 5,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 10000,
      })
      const client = await this.pool.connect()
      client.release()
    } catch (err) {
      throw new DataSourceError(`Failed to connect: ${(err as Error).message}`, undefined, err)
    }
  }

  async disconnect(): Promise<void> {
    if (this.pool) {
      await this.pool.end()
      this.pool = null
    }
  }

  async testConnection(): Promise<boolean> {
    const client = await this.pool!.connect()
    await client.query('SELECT 1')
    client.release()
    return true
  }

  async execute(query: string, params?: unknown[]): Promise<QueryResult> {
    if (!this.pool) throw new DataSourceError('Not connected')
    const start = Date.now()
    const queryId = nanoid()
    try {
      const result: PGQueryResult = await this.pool.query(query, params)
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

  async getSchemas(_database: string): Promise<string[]> {
    const result = await this.execute(
      `SELECT schema_name FROM information_schema.schemata
       WHERE schema_name NOT IN ('pg_catalog', 'information_schema', 'pg_toast', 'pg_temp_1', 'pg_toast_temp_1')
         AND schema_name NOT LIKE 'pg_%'
       ORDER BY schema_name`
    )
    return result.rows.map((r) => String(r['schema_name']))
  }

  async getTables(schema: string): Promise<TableInfo[]> {
    const result = await this.execute(
      `SELECT table_name, table_type
       FROM information_schema.tables
       WHERE table_schema = $1
       ORDER BY table_name`,
      [schema]
    )
    return result.rows.map((r) => ({
      name: String(r['table_name']),
      schema,
      type: r['table_type'] === 'VIEW' ? ('view' as const) : ('table' as const),
    }))
  }

  async getColumns(table: string, schema = 'public'): Promise<ColumnInfo[]> {
    const result = await this.execute(
      `SELECT
         c.column_name, c.data_type, c.is_nullable, c.column_default,
         (SELECT true FROM information_schema.table_constraints tc
          JOIN information_schema.key_column_usage kcu
            ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
          WHERE tc.constraint_type = 'PRIMARY KEY'
            AND tc.table_name = c.table_name AND kcu.column_name = c.column_name LIMIT 1
         ) AS is_pk,
         (SELECT true FROM information_schema.key_column_usage kcu2
          JOIN information_schema.table_constraints tc2
            ON kcu2.constraint_name = tc2.constraint_name
          WHERE tc2.constraint_type = 'FOREIGN KEY'
            AND tc2.table_name = c.table_name AND kcu2.column_name = c.column_name LIMIT 1
         ) AS is_fk
       FROM information_schema.columns c
       WHERE c.table_schema = $1 AND c.table_name = $2
       ORDER BY c.ordinal_position`,
      [schema, table]
    )
    return result.rows.map((r) => ({
      name: String(r['column_name']),
      type: String(r['data_type']),
      nullable: r['is_nullable'] === 'YES',
      defaultValue: r['column_default'] ? String(r['column_default']) : undefined,
      isPrimaryKey: r['is_pk'] === true,
      isForeignKey: r['is_fk'] === true,
    }))
  }

  async getRelationships(schema: string): Promise<Relationship[]> {
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
      [schema]
    )
    return result.rows.map((r) => ({
      sourceTable: String(r['source_table']),
      sourceColumn: String(r['source_column']),
      targetTable: String(r['target_table']),
      targetColumn: String(r['target_column']),
      constraintName: String(r['constraint_name']),
    }))
  }

  async getIndexes(table: string, schema = 'public'): Promise<IndexInfo[]> {
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
      [table, schema]
    )
    return result.rows.map((r) => ({
      name: String(r['index_name']),
      columns: r['columns'] as string[],
      isUnique: Boolean(r['is_unique']),
      isPrimary: Boolean(r['is_primary']),
    }))
  }
}
