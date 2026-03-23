import Store from 'electron-store'
import type { Snippet } from '../../shared/types/snippet'

interface StoreSchema {
  snippets: Snippet[]
}

const BUILT_IN_SNIPPETS: Snippet[] = [
  {
    id: 'builtin-list-tables',
    title: 'List all tables',
    description: 'Show all tables across all schemas in the current database',
    sql: `SELECT table_schema, table_name, table_type
FROM information_schema.tables
WHERE table_schema NOT IN ('pg_catalog', 'information_schema')
ORDER BY table_schema, table_name;`,
    category: 'schema',
    isBuiltIn: true,
    createdAt: '2024-01-01T00:00:00.000Z',
  },
  {
    id: 'builtin-table-sizes',
    title: 'Table sizes',
    description: 'Show total size of each table including indexes and TOAST',
    sql: `SELECT
  schemaname || '.' || relname AS table,
  pg_size_pretty(pg_total_relation_size(relid)) AS total_size,
  pg_size_pretty(pg_relation_size(relid)) AS data_size,
  pg_size_pretty(pg_total_relation_size(relid) - pg_relation_size(relid)) AS index_size
FROM pg_catalog.pg_statio_user_tables
ORDER BY pg_total_relation_size(relid) DESC;`,
    category: 'admin',
    isBuiltIn: true,
    createdAt: '2024-01-01T00:00:00.000Z',
  },
  {
    id: 'builtin-running-queries',
    title: 'Running queries',
    description: 'Show currently executing queries with duration',
    sql: `SELECT
  pid,
  usename,
  datname,
  state,
  now() - query_start AS duration,
  query
FROM pg_stat_activity
WHERE state != 'idle'
  AND pid != pg_backend_pid()
ORDER BY query_start;`,
    category: 'performance',
    isBuiltIn: true,
    createdAt: '2024-01-01T00:00:00.000Z',
  },
  {
    id: 'builtin-index-usage',
    title: 'Index usage',
    description: 'Show index usage statistics to find unused indexes',
    sql: `SELECT
  schemaname || '.' || relname AS table,
  indexrelname AS index,
  idx_scan AS scans,
  idx_tup_read AS tuples_read,
  idx_tup_fetch AS tuples_fetched,
  pg_size_pretty(pg_relation_size(indexrelid)) AS index_size
FROM pg_stat_user_indexes
ORDER BY idx_scan ASC;`,
    category: 'performance',
    isBuiltIn: true,
    createdAt: '2024-01-01T00:00:00.000Z',
  },
  {
    id: 'builtin-vacuum-stats',
    title: 'Vacuum stats',
    description: 'Show last vacuum and analyze times for each table',
    sql: `SELECT
  schemaname || '.' || relname AS table,
  last_vacuum,
  last_autovacuum,
  last_analyze,
  last_autoanalyze,
  n_dead_tup AS dead_tuples
FROM pg_stat_user_tables
ORDER BY n_dead_tup DESC;`,
    category: 'admin',
    isBuiltIn: true,
    createdAt: '2024-01-01T00:00:00.000Z',
  },
  {
    id: 'builtin-kill-connection',
    title: 'Kill connection',
    description: 'Terminate a backend connection by PID (replace <PID>)',
    sql: `SELECT pg_terminate_backend(<PID>);`,
    category: 'admin',
    isBuiltIn: true,
    createdAt: '2024-01-01T00:00:00.000Z',
  },
  {
    id: 'builtin-database-size',
    title: 'Database size',
    description: 'Show the size of the current database',
    sql: `SELECT
  pg_database.datname AS database,
  pg_size_pretty(pg_database_size(pg_database.datname)) AS size
FROM pg_database
ORDER BY pg_database_size(pg_database.datname) DESC;`,
    category: 'admin',
    isBuiltIn: true,
    createdAt: '2024-01-01T00:00:00.000Z',
  },
  {
    id: 'builtin-table-row-counts',
    title: 'Table row counts',
    description: 'Estimated row counts from pg_class (fast, no sequential scan)',
    sql: `SELECT
  schemaname || '.' || relname AS table,
  n_live_tup AS estimated_rows
FROM pg_stat_user_tables
ORDER BY n_live_tup DESC;`,
    category: 'data',
    isBuiltIn: true,
    createdAt: '2024-01-01T00:00:00.000Z',
  },
]

class SnippetManager {
  private store: Store<StoreSchema>

  constructor() {
    this.store = new Store<StoreSchema>({ name: 'snippets' })
  }

  list(): Snippet[] {
    const custom = this.store.get('snippets', [])
    return [...BUILT_IN_SNIPPETS, ...custom]
  }

  save(snippet: Snippet): void {
    const snippets = this.store.get('snippets', [])
    const idx = snippets.findIndex((s) => s.id === snippet.id)

    if (idx >= 0) {
      snippets[idx] = snippet
    } else {
      snippets.push(snippet)
    }

    this.store.set('snippets', snippets)
  }

  delete(id: string): void {
    // Prevent deletion of built-in snippets
    if (BUILT_IN_SNIPPETS.some((s) => s.id === id)) return

    const snippets = this.store.get('snippets', [])
    this.store.set(
      'snippets',
      snippets.filter((s) => s.id !== id),
    )
  }
}

// Singleton shared across all IPC handlers
export const snippetManager = new SnippetManager()
