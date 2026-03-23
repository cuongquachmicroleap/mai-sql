import { useState, useEffect, useCallback, useRef } from 'react'
import { ChevronRight, ChevronDown, Database, Table2, Loader2, AlertCircle, RefreshCw, Key, FunctionSquare, List, Zap, ListOrdered, Server, Plus } from 'lucide-react'
import { invoke } from '../../lib/ipc-client'
import { useEditorStore } from '../../stores/editor-store'
import { useConnectionStore } from '../../stores/connection-store'
import type { TableInfo, ColumnInfo, FunctionInfo, IndexInfo, TriggerInfo } from '@shared/types/schema'

interface DatabaseTreeProps {
  connectionId: string
}

interface ContextMenuState {
  x: number
  y: number
  schema: string
  table: string
  database: string
}

function ContextMenu({
  menu, onClose, onAction,
}: {
  menu: ContextMenuState
  onClose: () => void
  onAction: (action: 'select100' | 'copyName' | 'countRows' | 'designTable' | 'newTable' | 'mindmap') => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose])

  const items: { label: string; action: 'select100' | 'copyName' | 'countRows' | 'designTable' | 'newTable' | 'mindmap'; separator?: boolean }[] = [
    { label: 'Select Top 100', action: 'select100' },
    { label: 'Count Rows', action: 'countRows' },
    { label: 'Copy Name', action: 'copyName' },
    { label: 'Design Table', action: 'designTable', separator: true },
    { label: 'New Table...', action: 'newTable' },
    { label: 'Open Mindmap', action: 'mindmap', separator: true },
  ]
  return (
    <div ref={ref} style={{ position: 'fixed', left: menu.x, top: menu.y, zIndex: 1000, background: 'var(--mai-bg-elevated)', border: '1px solid var(--mai-border-strong)', borderRadius: 7, padding: 4, boxShadow: '0 8px 32px rgba(0,0,0,0.5)', minWidth: 160 }}>
      {items.map((item) => (
        <div key={item.action}>
          {item.separator && <div style={{ height: 1, background: 'var(--mai-border-strong)', margin: '3px 6px' }} />}
          <button onClick={() => { onAction(item.action); onClose() }} className="flex w-full items-center"
            style={{ height: 28, padding: '0 10px', fontSize: 12, color: 'var(--mai-text-1)', background: 'transparent', border: 'none', borderRadius: 4, cursor: 'pointer', textAlign: 'left' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--mai-border-strong)' }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
          >{item.label}</button>
        </div>
      ))}
    </div>
  )
}

function SectionRow({ label, icon, expanded, loading, onClick, indent, onAction, actionIcon }: {
  label: string; icon: React.ReactNode; expanded: boolean; loading: boolean; onClick: () => void; indent: number
  onAction?: () => void; actionIcon?: React.ReactNode
}) {
  const [hovered, setHovered] = useState(false)
  return (
    <div className="flex w-full items-center" style={{ position: 'relative' }}
      onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
    >
      <button onClick={onClick}
        className="flex w-full items-center gap-1"
        style={{ height: 22, paddingLeft: indent, paddingRight: onAction ? 24 : 8, color: 'var(--mai-text-3)', background: hovered ? 'var(--mai-bg-hover)' : 'transparent', border: 'none', cursor: 'pointer' }}
      >
        {loading ? <Loader2 size={9} className="animate-spin shrink-0" /> : expanded ? <ChevronDown size={9} className="shrink-0" /> : <ChevronRight size={9} className="shrink-0" />}
        <span style={{ marginLeft: 1 }}>{icon}</span>
        <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>{label}</span>
      </button>
      {onAction && hovered && (
        <button
          onClick={(e) => { e.stopPropagation(); onAction() }}
          title={`New ${label.replace(/s$/, '')}`}
          className="flex items-center justify-center"
          style={{
            position: 'absolute', right: 4, top: 3,
            width: 16, height: 16, borderRadius: 3,
            background: 'transparent', border: 'none',
            color: 'var(--mai-text-3)', cursor: 'pointer', transition: 'color 0.12s, background 0.12s',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--mai-text-1)'; e.currentTarget.style.background = 'var(--mai-border-strong)' }}
          onMouseLeave={(e) => { e.currentTarget.style.color = '#6B6B7B'; e.currentTarget.style.background = 'transparent' }}
        >
          {actionIcon || <Plus size={10} />}
        </button>
      )}
    </div>
  )
}

// Key helpers — prefix everything with database name for uniqueness
const dbKey = (db: string) => `db:${db}`
const schemaKey = (db: string, schema: string) => `${db}/${schema}`
const tablesKey = (db: string, schema: string) => `${db}/${schema}:tables`
const tableKey = (db: string, schema: string, table: string) => `${db}/${schema}.${table}`
const indexesKey = (db: string, schema: string, table: string) => `${db}/${schema}.${table}:indexes`
const triggersKey = (db: string, schema: string, table: string) => `${db}/${schema}.${table}:triggers`
const functionsKey = (db: string, schema: string) => `${db}/${schema}:functions`
const enumsKey = (db: string, schema: string) => `${db}/${schema}:enums`
const dataKey = (db: string, schema: string) => `${db}:${schema}`
const tableDataKey = (db: string, schema: string, table: string) => `${db}:${schema}.${table}`

export function DatabaseTree({ connectionId }: DatabaseTreeProps) {
  const [databases, setDatabases] = useState<string[]>([])
  const [defaultDatabase, setDefaultDatabase] = useState<string>('postgres')
  const [hasSchemas, setHasSchemas] = useState(true) // false for MySQL/ClickHouse/MongoDB
  const [schemasByDb, setSchemasByDb] = useState<Record<string, string[]>>({})
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [tablesBySchema, setTablesBySchema] = useState<Record<string, TableInfo[]>>({})
  const [columnsByTable, setColumnsByTable] = useState<Record<string, ColumnInfo[]>>({})
  const [indexesByTable, setIndexesByTable] = useState<Record<string, IndexInfo[]>>({})
  const [triggersByTable, setTriggersByTable] = useState<Record<string, TriggerInfo[]>>({})
  const [functionsBySchema, setFunctionsBySchema] = useState<Record<string, FunctionInfo[]>>({})
  const [enumsBySchema, setEnumsBySchema] = useState<Record<string, { name: string; values: string[] }[]>>({})
  const [rowCountByTable, setRowCountByTable] = useState<Record<string, number>>({})
  const [loadingKeys, setLoadingKeys] = useState<Set<string>>(new Set())
  const [error, setError] = useState<string | null>(null)
  const [hoveredRow, setHoveredRow] = useState<string | null>(null)
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null)
  const { addTabWithContent } = useEditorStore()
  const configuredDatabase = useConnectionStore(
    (s) => s.connections.find((c) => c.id === connectionId)?.database
  )

  const fetchRowCount = useCallback(async (database: string, schema: string, tables: TableInfo[], useSchemas: boolean) => {
    for (const table of tables) {
      try {
        // PostgreSQL uses pg_class for fast estimates; other databases use COUNT(*)
        const sql = useSchemas
          ? `SELECT reltuples::bigint AS estimate FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = '${schema}' AND c.relname = '${table.name}'`
          : `SELECT COUNT(*) AS estimate FROM \`${table.name}\``
        const result = await invoke('query:execute', connectionId, sql, database)
        const estimate = result.rows[0]?.['estimate']
        if (estimate !== undefined && estimate !== null)
          setRowCountByTable((prev) => ({ ...prev, [tableDataKey(database, schema, table.name)]: Number(estimate) }))
      } catch { /* silently ignore */ }
    }
  }, [connectionId])

  const loadSchema = useCallback(async () => {
    setDatabases([]); setSchemasByDb({}); setExpanded(new Set()); setTablesBySchema({}); setColumnsByTable({})
    setIndexesByTable({}); setTriggersByTable({}); setFunctionsBySchema({}); setEnumsBySchema({}); setRowCountByTable({})
    setError(null); setLoadingKeys(new Set(['root']))
    try {
      const [allDbs, defDb, supportsSchemas] = await Promise.all([
        invoke('schema:databases', connectionId),
        invoke('schema:default-database', connectionId),
        invoke('schema:supports-schemas', connectionId),
      ])
      setHasSchemas(supportsSchemas)
      if (allDbs.length === 0) { setError('No databases found'); return }
      // If connection specifies a database, only show that one
      const dbs = configuredDatabase
        ? allDbs.filter((db) => db === configuredDatabase)
        : allDbs
      if (dbs.length === 0) { setError(`Database '${configuredDatabase}' not found`); return }
      setDatabases(dbs)
      setDefaultDatabase(defDb)

      // Auto-expand the default database
      const expandKeys = new Set([dbKey(defDb)])
      setExpanded(expandKeys)
      setLoadingKeys((prev) => new Set(prev).add(dbKey(defDb)))

      if (supportsSchemas) {
        // PostgreSQL/MSSQL: load schemas then auto-expand first schema's tables
        let schemaList = await invoke('schema:schemas', connectionId, defDb)
        if (schemaList.length === 0) schemaList = ['public']
        setSchemasByDb({ [defDb]: schemaList })

        const firstSchema = schemaList[0]
        if (firstSchema) {
          expandKeys.add(schemaKey(defDb, firstSchema))
          expandKeys.add(tablesKey(defDb, firstSchema))
          setExpanded(new Set(expandKeys))
          setLoadingKeys((prev) => new Set(prev).add(schemaKey(defDb, firstSchema)))
          try {
            const tables = await invoke('schema:tables', connectionId, firstSchema, defDb)
            setTablesBySchema({ [dataKey(defDb, firstSchema)]: tables })
            fetchRowCount(defDb, firstSchema, tables, true)
          } finally {
            setLoadingKeys((prev) => { const n = new Set(prev); n.delete(schemaKey(defDb, firstSchema)); return n })
          }
        }
      } else {
        // MySQL/ClickHouse/MongoDB: skip schema level, load tables directly
        // Use 'default' as the synthetic schema key to keep data structures consistent
        const syntheticSchema = 'default'
        setSchemasByDb({ [defDb]: [syntheticSchema] })
        expandKeys.add(tablesKey(defDb, syntheticSchema))
        setExpanded(new Set(expandKeys))
        setLoadingKeys((prev) => new Set(prev).add(dbKey(defDb)))
        try {
          const tables = await invoke('schema:tables', connectionId, syntheticSchema, defDb)
          setTablesBySchema({ [dataKey(defDb, syntheticSchema)]: tables })
          fetchRowCount(defDb, syntheticSchema, tables, false)
        } finally {
          setLoadingKeys((prev) => { const n = new Set(prev); n.delete(dbKey(defDb)); return n })
        }
      }
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoadingKeys((prev) => { const n = new Set(prev); n.delete('root'); n.delete(dbKey(defaultDatabase)); return n })
    }
  }, [connectionId, configuredDatabase, fetchRowCount, defaultDatabase])

  useEffect(() => { loadSchema() }, [loadSchema])

  const loadSchemasForDb = async (database: string) => {
    if (schemasByDb[database]?.length) return
    const key = dbKey(database)
    setLoadingKeys((prev) => new Set(prev).add(key))
    try {
      if (hasSchemas) {
        let schemaList = await invoke('schema:schemas', connectionId, database)
        if (schemaList.length === 0) schemaList = ['public']
        setSchemasByDb((prev) => ({ ...prev, [database]: schemaList }))
      } else {
        // No schemas — use synthetic 'default' and auto-load tables
        setSchemasByDb((prev) => ({ ...prev, [database]: ['default'] }))
      }
    } catch {
      setSchemasByDb((prev) => ({ ...prev, [database]: [] }))
    } finally {
      setLoadingKeys((prev) => { const n = new Set(prev); n.delete(key); return n })
    }
  }

  const loadTables = async (database: string, schema: string) => {
    const dk = dataKey(database, schema)
    if (tablesBySchema[dk]?.length) return
    const lk = schemaKey(database, schema)
    setLoadingKeys((prev) => new Set(prev).add(lk))
    try {
      const tables = await invoke('schema:tables', connectionId, schema, database)
      setTablesBySchema((prev) => ({ ...prev, [dk]: tables }))
      fetchRowCount(database, schema, tables)
    } catch {
      setTablesBySchema((prev) => ({ ...prev, [dk]: [] }))
    } finally {
      setLoadingKeys((prev) => { const n = new Set(prev); n.delete(lk); return n })
    }
  }

  const loadColumns = async (database: string, schema: string, table: string) => {
    const dk = tableDataKey(database, schema, table)
    if (columnsByTable[dk]?.length) return
    setLoadingKeys((prev) => new Set(prev).add(dk))
    try {
      const columns = await invoke('schema:columns', connectionId, table, schema, database)
      setColumnsByTable((prev) => ({ ...prev, [dk]: columns }))
    } catch {
      setColumnsByTable((prev) => ({ ...prev, [dk]: [] }))
    } finally {
      setLoadingKeys((prev) => { const n = new Set(prev); n.delete(dk); return n })
    }
  }

  const loadIndexes = async (database: string, schema: string, table: string) => {
    const dk = tableDataKey(database, schema, table)
    if (indexesByTable[dk] !== undefined) return
    const lk = `${dk}:indexes`
    setLoadingKeys((prev) => new Set(prev).add(lk))
    try {
      const indexes = await invoke('schema:indexes', connectionId, table, schema, database)
      setIndexesByTable((prev) => ({ ...prev, [dk]: indexes }))
    } catch {
      setIndexesByTable((prev) => ({ ...prev, [dk]: [] }))
    } finally {
      setLoadingKeys((prev) => { const n = new Set(prev); n.delete(lk); return n })
    }
  }

  const loadTriggers = async (database: string, schema: string, table: string) => {
    const dk = tableDataKey(database, schema, table)
    if (triggersByTable[dk] !== undefined) return
    const lk = `${dk}:triggers`
    setLoadingKeys((prev) => new Set(prev).add(lk))
    try {
      const triggers = await invoke('schema:triggers', connectionId, table, schema, database)
      setTriggersByTable((prev) => ({ ...prev, [dk]: triggers }))
    } catch {
      setTriggersByTable((prev) => ({ ...prev, [dk]: [] }))
    } finally {
      setLoadingKeys((prev) => { const n = new Set(prev); n.delete(lk); return n })
    }
  }

  const loadFunctions = async (database: string, schema: string) => {
    const dk = dataKey(database, schema)
    if (functionsBySchema[dk] !== undefined) return
    const lk = functionsKey(database, schema)
    setLoadingKeys((prev) => new Set(prev).add(lk))
    try {
      const fns = await invoke('schema:functions', connectionId, schema, database)
      setFunctionsBySchema((prev) => ({ ...prev, [dk]: fns }))
    } catch {
      setFunctionsBySchema((prev) => ({ ...prev, [dk]: [] }))
    } finally {
      setLoadingKeys((prev) => { const n = new Set(prev); n.delete(lk); return n })
    }
  }

  const loadEnums = async (database: string, schema: string) => {
    // Enums are PostgreSQL-specific — skip for other databases
    if (!hasSchemas) return
    const dk = dataKey(database, schema)
    if (enumsBySchema[dk] !== undefined) return
    const lk = enumsKey(database, schema)
    setLoadingKeys((prev) => new Set(prev).add(lk))
    try {
      const result = await invoke('query:execute', connectionId,
        `SELECT t.typname AS name, e.enumlabel AS value ` +
        `FROM pg_type t ` +
        `JOIN pg_enum e ON e.enumtypid = t.oid ` +
        `JOIN pg_namespace n ON t.typnamespace = n.oid ` +
        `WHERE n.nspname = '${schema}' ` +
        `ORDER BY t.typname, e.enumsortorder`)
      const grouped = new Map<string, string[]>()
      for (const row of result.rows as Record<string, unknown>[]) {
        const name = String(row['name'])
        const value = String(row['value'])
        if (!grouped.has(name)) grouped.set(name, [])
        grouped.get(name)!.push(value)
      }
      setEnumsBySchema((prev) => ({
        ...prev,
        [dk]: Array.from(grouped.entries()).map(([name, values]) => ({ name, values })),
      }))
    } catch {
      setEnumsBySchema((prev) => ({ ...prev, [dk]: [] }))
    } finally {
      setLoadingKeys((prev) => { const n = new Set(prev); n.delete(lk); return n })
    }
  }

  const toggle = async (key: string, onExpand?: () => Promise<void>) => {
    const isExpanded = expanded.has(key)
    setExpanded((prev) => { const next = new Set(prev); if (isExpanded) next.delete(key); else next.add(key); return next })
    if (!isExpanded && onExpand) await onExpand()
  }

  const insertTableQuery = (database: string, schema: string, table: string) => {
    const qualifiedName = hasSchemas ? `${schema}.${table}` : table
    addTabWithContent(table, `SELECT *\nFROM ${qualifiedName}\nLIMIT 100;`, database)
  }

  const handleContextMenu = (e: React.MouseEvent, database: string, schema: string, table: string) => {
    e.preventDefault(); e.stopPropagation()
    setContextMenu({ x: e.clientX, y: e.clientY, database, schema, table })
  }

  const handleContextAction = (action: 'select100' | 'copyName' | 'countRows' | 'designTable' | 'newTable' | 'mindmap') => {
    if (!contextMenu) return
    const { database, schema, table } = contextMenu
    const fullName = hasSchemas ? `${schema}.${table}` : table
    switch (action) {
      case 'select100': addTabWithContent(table, `SELECT * FROM ${fullName} LIMIT 100;`, database); break
      case 'countRows': addTabWithContent(`COUNT ${table}`, `SELECT COUNT(*) FROM ${fullName};`, database); break
      case 'copyName': navigator.clipboard.writeText(fullName).catch(() => {}); break
      case 'designTable': useEditorStore.getState().openTableDesigner(connectionId, schema, table, database); break
      case 'newTable': useEditorStore.getState().openTableDesigner(connectionId, schema, undefined, database); break
      case 'mindmap': useEditorStore.getState().openMindmap(database, schema); break
    }
  }

  const formatRowCount = (n: number) => {
    if (n < 0) return ''
    if (n >= 1_000_000) return `~${(n / 1_000_000).toFixed(1)}M`
    if (n >= 1_000) return `~${(n / 1_000).toFixed(0)}k`
    return String(n)
  }

  const emptyHint = (msg: string, indent = 64) => (
    <div style={{ paddingLeft: indent, paddingRight: 8, height: 20, display: 'flex', alignItems: 'center', gap: 4, color: 'var(--mai-text-3)', fontSize: 10 }}>
      <AlertCircle size={8} /><span>{msg}</span>
    </div>
  )

  const isRefreshing = loadingKeys.has('root')

  const header = (
    <div className="flex items-center justify-between" style={{ padding: '6px 8px 4px', marginBottom: 2 }}>
      <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.09em', textTransform: 'uppercase', color: 'var(--mai-text-3)' }}>Databases</span>
      <button onClick={loadSchema} disabled={isRefreshing} title="Refresh schema" className="flex items-center justify-center rounded"
        style={{ width: 16, height: 16, color: 'var(--mai-text-3)', background: 'none', border: 'none', cursor: 'pointer', transition: 'color 0.12s' }}
        onMouseEnter={(e) => e.currentTarget.style.color = 'var(--mai-text-1)'}
        onMouseLeave={(e) => e.currentTarget.style.color = 'var(--mai-text-3)'}
      ><RefreshCw size={10} className={isRefreshing ? 'animate-spin' : ''} /></button>
    </div>
  )

  if (isRefreshing) return (
    <>{header}<div className="flex items-center gap-2" style={{ padding: '4px 8px', color: 'var(--mai-text-3)' }}><Loader2 size={11} className="animate-spin shrink-0" /><span style={{ fontSize: 12 }}>Loading databases...</span></div></>
  )
  if (error) return (
    <>{header}<div className="flex items-start gap-1.5" style={{ padding: '4px 8px', color: '#F87171' }}><AlertCircle size={11} className="shrink-0" style={{ marginTop: 2 }} /><span className="break-all" style={{ fontSize: 12 }}>{error}</span></div></>
  )
  if (databases.length === 0) return (
    <>{header}<div style={{ padding: '4px 8px', color: 'var(--mai-text-3)', fontSize: 12 }}>No databases found</div></>
  )

  return (
    <div className="select-none" style={{ fontSize: 12 }}>
      {header}
      {contextMenu && <ContextMenu menu={contextMenu} onClose={() => setContextMenu(null)} onAction={handleContextAction} />}

      {databases.map((database) => {
        const isDefault = database === defaultDatabase
        const schemas = schemasByDb[database] ?? []

        return (
          <div key={database}>
            {/* Database row */}
            <button
              onClick={() => toggle(dbKey(database), () => loadSchemasForDb(database))}
              onMouseEnter={() => setHoveredRow(`db:${database}`)}
              onMouseLeave={() => setHoveredRow(null)}
              className="flex w-full items-center gap-1"
              style={{ height: 26, paddingLeft: 8, paddingRight: 8, color: isDefault ? 'var(--mai-text-1)' : 'var(--mai-text-2)', background: hoveredRow === `db:${database}` ? 'var(--mai-bg-hover)' : 'transparent', border: 'none', cursor: 'pointer', transition: 'background 0.1s' }}
            >
              {loadingKeys.has(dbKey(database)) ? <Loader2 size={11} className="animate-spin shrink-0" /> : expanded.has(dbKey(database)) ? <ChevronDown size={11} className="shrink-0" /> : <ChevronRight size={11} className="shrink-0" />}
              <Server size={11} className="shrink-0" style={{ color: isDefault ? '#34D399' : 'var(--mai-accent)' }} />
              <span style={{ fontWeight: isDefault ? 600 : 400 }} className="truncate">{database}</span>
              {isDefault && <span style={{ fontSize: 9, color: 'var(--mai-text-3)', marginLeft: 'auto', flexShrink: 0 }}>connected</span>}
            </button>

            {expanded.has(dbKey(database)) && schemas.map((schema) => {
              const dk = dataKey(database, schema)
              const tables = tablesBySchema[dk] ?? []
              const functions = functionsBySchema[dk] ?? []

              // For non-schema databases (MySQL etc), auto-load tables when database expands
              const schemaExpanded = hasSchemas ? expanded.has(schemaKey(database, schema)) : true
              // Indent levels: with schemas = 32/44, without = 20/32
              const sectionIndent = hasSchemas ? 32 : 20
              const tableIndent = hasSchemas ? 44 : 32

              return (
                <div key={schema}>
                  {/* Schema row — only shown for databases that support schemas */}
                  {hasSchemas && (
                    <button
                      onClick={() => toggle(schemaKey(database, schema), () => loadTables(database, schema))}
                      onMouseEnter={() => setHoveredRow(`schema:${database}/${schema}`)}
                      onMouseLeave={() => setHoveredRow(null)}
                      className="flex w-full items-center gap-1"
                      style={{ height: 24, paddingLeft: 20, paddingRight: 8, color: 'var(--mai-text-2)', background: hoveredRow === `schema:${database}/${schema}` ? 'var(--mai-bg-hover)' : 'transparent', border: 'none', cursor: 'pointer', transition: 'background 0.1s' }}
                    >
                      {loadingKeys.has(schemaKey(database, schema)) ? <Loader2 size={10} className="animate-spin shrink-0" /> : expanded.has(schemaKey(database, schema)) ? <ChevronDown size={10} className="shrink-0" /> : <ChevronRight size={10} className="shrink-0" />}
                      <Database size={10} className="shrink-0" style={{ color: 'var(--mai-accent)' }} />
                      <span style={{ fontWeight: 500, fontSize: 11 }} className="truncate">{schema}</span>
                    </button>
                  )}

                  {schemaExpanded && (<>
                    {/* ── Tables section ── */}
                    <SectionRow label="Tables" icon={<Table2 size={9} style={{ color: '#F97316' }} />}
                      expanded={expanded.has(tablesKey(database, schema))} loading={loadingKeys.has(hasSchemas ? schemaKey(database, schema) : dbKey(database))}
                      onClick={() => toggle(tablesKey(database, schema), () => loadTables(database, schema))} indent={sectionIndent}
                      onAction={() => useEditorStore.getState().openTableDesigner(connectionId, schema, undefined, database)} />

                    {expanded.has(tablesKey(database, schema)) && (tables.length === 0
                      ? emptyHint('No tables found', sectionIndent + 12)
                      : tables.map((table) => {
                        const tk = tableKey(database, schema, table.name)
                        const tdk = tableDataKey(database, schema, table.name)
                        const rowCount = rowCountByTable[tdk]
                        const indexes = indexesByTable[tdk] ?? []
                        const triggers = triggersByTable[tdk] ?? []

                        return (
                          <div key={table.name}>
                            {/* Table row */}
                            <button
                              onClick={() => toggle(tk, () => loadColumns(database, schema, table.name))}
                              onDoubleClick={() => insertTableQuery(database, schema, table.name)}
                              onContextMenu={(e) => handleContextMenu(e, database, schema, table.name)}
                              onMouseEnter={() => setHoveredRow(`table:${tk}`)}
                              onMouseLeave={() => setHoveredRow(null)}
                              className="flex w-full items-center gap-1"
                              style={{ height: 24, paddingLeft: tableIndent, paddingRight: 8, color: 'var(--mai-text-1)', background: hoveredRow === `table:${tk}` ? 'var(--mai-bg-hover)' : 'transparent', border: 'none', cursor: 'pointer', transition: 'background 0.1s' }}
                              title="Double-click to SELECT * | Right-click for options"
                            >
                              {loadingKeys.has(tdk) ? <Loader2 size={10} className="animate-spin shrink-0" /> : expanded.has(tk) ? <ChevronDown size={10} className="shrink-0" /> : <ChevronRight size={10} className="shrink-0" />}
                              <Table2 size={10} className="shrink-0" style={{ color: table.type === 'view' ? 'var(--mai-accent)' : '#F97316' }} />
                              <span className="truncate" style={{ fontSize: 11 }}>{table.name}</span>
                              {rowCount !== undefined && <span className="ml-auto shrink-0" style={{ fontSize: 10, color: 'var(--mai-text-3)' }}>{formatRowCount(rowCount)}</span>}
                            </button>

                            {expanded.has(tk) && (<>
                              {/* Columns */}
                              {(columnsByTable[tdk] ?? []).map((col) => (
                                <div key={col.name} className="flex items-center gap-1"
                                  onMouseEnter={() => setHoveredRow(`col:${tdk}.${col.name}`)}
                                  onMouseLeave={() => setHoveredRow(null)}
                                  style={{ height: 21, paddingLeft: tableIndent + 12, paddingRight: 8, background: hoveredRow === `col:${tdk}.${col.name}` ? 'var(--mai-bg-hover)' : 'transparent', transition: 'background 0.1s' }}
                                >
                                  {col.isPrimaryKey ? <Key size={9} className="shrink-0" style={{ color: '#FBBF24' }} />
                                    : col.isForeignKey ? <span style={{ fontSize: 9, color: '#F97316', lineHeight: 1, flexShrink: 0 }}>→</span>
                                    : <span style={{ width: 9, flexShrink: 0, display: 'inline-block' }} />}
                                  <span className="truncate" style={{ color: col.isPrimaryKey ? '#FBBF24' : col.isForeignKey ? '#F97316' : 'var(--mai-text-1)', fontSize: 11, fontWeight: col.isPrimaryKey ? 600 : 400 }}>{col.name}</span>
                                  {!col.nullable && <span title="NOT NULL" style={{ fontSize: 9, color: '#F87171', fontWeight: 700, marginLeft: 2, flexShrink: 0 }}>!</span>}
                                  {col.nullable && <span title="Nullable" style={{ fontSize: 9, color: 'var(--mai-text-3)', marginLeft: 2, flexShrink: 0 }}>?</span>}
                                  <span className="ml-auto shrink-0" style={{ fontSize: 10, color: 'var(--mai-text-3)', fontFamily: 'monospace' }}>{col.displayType}</span>
                                </div>
                              ))}

                              {/* Indexes sub-section */}
                              <SectionRow label="Indexes" icon={<List size={9} style={{ color: '#6EE7B7' }} />}
                                expanded={expanded.has(indexesKey(database, schema, table.name))} loading={loadingKeys.has(`${tdk}:indexes`)}
                                onClick={() => toggle(indexesKey(database, schema, table.name), () => loadIndexes(database, schema, table.name))} indent={tableIndent + 12} />

                              {expanded.has(indexesKey(database, schema, table.name)) && (indexes.length === 0
                                ? emptyHint('No indexes', 68)
                                : indexes.map((idx) => (
                                  <div key={idx.name} onMouseEnter={() => setHoveredRow(`idx:${tdk}.${idx.name}`)} onMouseLeave={() => setHoveredRow(null)}
                                    className="flex items-center gap-1"
                                    style={{ height: 20, paddingLeft: tableIndent + 24, paddingRight: 8, background: hoveredRow === `idx:${tdk}.${idx.name}` ? 'var(--mai-bg-hover)' : 'transparent', transition: 'background 0.1s' }}
                                  >
                                    <List size={8} className="shrink-0" style={{ color: idx.isPrimary ? '#FBBF24' : idx.isUnique ? '#6EE7B7' : 'var(--mai-text-3)' }} />
                                    <span className="truncate" style={{ fontSize: 10, color: 'var(--mai-text-1)' }}>{idx.name}</span>
                                    <span className="ml-auto shrink-0" style={{ fontSize: 9, color: 'var(--mai-text-3)', fontFamily: 'monospace' }}>{idx.columns.join(', ')}</span>
                                  </div>
                                ))
                              )}

                              {/* Triggers sub-section */}
                              <SectionRow label="Triggers" icon={<Zap size={9} style={{ color: '#FCD34D' }} />}
                                expanded={expanded.has(triggersKey(database, schema, table.name))} loading={loadingKeys.has(`${tdk}:triggers`)}
                                onClick={() => toggle(triggersKey(database, schema, table.name), () => loadTriggers(database, schema, table.name))} indent={tableIndent + 12} />

                              {expanded.has(triggersKey(database, schema, table.name)) && (triggers.length === 0
                                ? emptyHint('No triggers', 68)
                                : triggers.map((trg) => (
                                  <div key={trg.name} onMouseEnter={() => setHoveredRow(`trg:${tdk}.${trg.name}`)} onMouseLeave={() => setHoveredRow(null)}
                                    className="flex items-center gap-1"
                                    style={{ height: 20, paddingLeft: tableIndent + 24, paddingRight: 8, background: hoveredRow === `trg:${tdk}.${trg.name}` ? 'var(--mai-bg-hover)' : 'transparent', transition: 'background 0.1s' }}
                                  >
                                    <Zap size={8} className="shrink-0" style={{ color: '#FCD34D' }} />
                                    <span className="truncate" style={{ fontSize: 10, color: 'var(--mai-text-1)' }}>{trg.name}</span>
                                    <span className="ml-auto shrink-0" style={{ fontSize: 9, color: 'var(--mai-text-3)' }}>{trg.timing} {trg.event}</span>
                                  </div>
                                ))
                              )}
                            </>)}
                          </div>
                        )
                      })
                    )}

                    {/* ── Functions & Procedures section ── */}
                    <SectionRow label="Functions" icon={<FunctionSquare size={9} style={{ color: '#A78BFA' }} />}
                      expanded={expanded.has(functionsKey(database, schema))} loading={loadingKeys.has(functionsKey(database, schema))}
                      onClick={() => toggle(functionsKey(database, schema), () => loadFunctions(database, schema))} indent={sectionIndent} />

                    {expanded.has(functionsKey(database, schema)) && (functions.length === 0
                      ? emptyHint('No functions found', sectionIndent + 12)
                      : functions.map((fn) => (
                        <div key={fn.name} onMouseEnter={() => setHoveredRow(`fn:${dk}.${fn.name}`)} onMouseLeave={() => setHoveredRow(null)}
                          className="flex items-center gap-1"
                          style={{ height: 22, paddingLeft: sectionIndent + 12, paddingRight: 8, background: hoveredRow === `fn:${dk}.${fn.name}` ? 'var(--mai-bg-hover)' : 'transparent', transition: 'background 0.1s' }}
                        >
                          <FunctionSquare size={9} className="shrink-0" style={{ color: fn.kind === 'procedure' ? '#34D399' : '#A78BFA' }} />
                          <span className="truncate" style={{ fontSize: 11, color: 'var(--mai-text-1)' }}>{fn.name}</span>
                          <span className="ml-auto shrink-0" style={{ fontSize: 10, color: 'var(--mai-text-3)', fontFamily: 'monospace' }}>{fn.returnType || fn.language}</span>
                        </div>
                      ))
                    )}

                    {/* ── Enums section — PostgreSQL only ── */}
                    {hasSchemas && (
                    <SectionRow label="Enums" icon={<ListOrdered size={9} style={{ color: '#F472B6' }} />}
                      expanded={expanded.has(enumsKey(database, schema))} loading={loadingKeys.has(enumsKey(database, schema))}
                      onClick={() => toggle(enumsKey(database, schema), () => loadEnums(database, schema))} indent={sectionIndent} />
                    )}

                    {hasSchemas && expanded.has(enumsKey(database, schema)) && ((enumsBySchema[dk] ?? []).length === 0
                      ? emptyHint('No enums found', sectionIndent + 12)
                      : (enumsBySchema[dk] ?? []).map((en) => {
                        const ek = `${dk}:enum:${en.name}`
                        return (
                          <div key={en.name}>
                            <button
                              onClick={() => toggle(ek)}
                              onMouseEnter={() => setHoveredRow(`enum:${ek}`)}
                              onMouseLeave={() => setHoveredRow(null)}
                              className="flex w-full items-center gap-1"
                              style={{ height: 22, paddingLeft: sectionIndent + 12, paddingRight: 8, color: 'var(--mai-text-1)', background: hoveredRow === `enum:${ek}` ? 'var(--mai-bg-hover)' : 'transparent', border: 'none', cursor: 'pointer', transition: 'background 0.1s' }}
                            >
                              {expanded.has(ek) ? <ChevronDown size={10} className="shrink-0" /> : <ChevronRight size={10} className="shrink-0" />}
                              <ListOrdered size={9} className="shrink-0" style={{ color: '#F472B6' }} />
                              <span className="truncate" style={{ fontSize: 11 }}>{en.name}</span>
                              <span className="ml-auto shrink-0" style={{ fontSize: 10, color: 'var(--mai-text-3)' }}>{en.values.length} val{en.values.length !== 1 ? 's' : ''}</span>
                            </button>

                            {expanded.has(ek) && en.values.map((val, idx) => (
                              <div key={`${val}-${idx}`}
                                onMouseEnter={() => setHoveredRow(`enumval:${ek}.${val}`)}
                                onMouseLeave={() => setHoveredRow(null)}
                                className="flex items-center gap-1"
                                style={{ height: 20, paddingLeft: sectionIndent + 24, paddingRight: 8, background: hoveredRow === `enumval:${ek}.${val}` ? 'var(--mai-bg-hover)' : 'transparent', transition: 'background 0.1s' }}
                              >
                                <span style={{ width: 9, flexShrink: 0, display: 'inline-block', fontSize: 9, color: 'var(--mai-text-3)', textAlign: 'right', fontFamily: 'monospace' }}>{idx + 1}</span>
                                <span className="truncate" style={{ fontSize: 10, color: '#D4BFFF', fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace' }}>{val}</span>
                              </div>
                            ))}
                          </div>
                        )
                      })
                    )}
                  </>)}
                </div>
              )
            })}
          </div>
        )
      })}
    </div>
  )
}
