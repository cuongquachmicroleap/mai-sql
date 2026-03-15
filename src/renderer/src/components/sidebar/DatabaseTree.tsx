import { useState, useEffect, useCallback, useRef } from 'react'
import { ChevronRight, ChevronDown, Database, Table2, Loader2, AlertCircle, RefreshCw, Key } from 'lucide-react'
import { invoke } from '../../lib/ipc-client'
import { useEditorStore } from '../../stores/editor-store'
import type { TableInfo, ColumnInfo } from '@shared/types/schema'

interface DatabaseTreeProps {
  connectionId: string
}

// Simple floating context menu
interface ContextMenuState {
  x: number
  y: number
  schema: string
  table: string
}

function ContextMenu({
  menu,
  onClose,
  onAction,
}: {
  menu: ContextMenuState
  onClose: () => void
  onAction: (action: 'select100' | 'copyName' | 'countRows') => void
}) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose])

  const items: { label: string; action: 'select100' | 'copyName' | 'countRows' }[] = [
    { label: 'Select Top 100', action: 'select100' },
    { label: 'Count Rows', action: 'countRows' },
    { label: 'Copy Name', action: 'copyName' },
  ]

  return (
    <div
      ref={ref}
      style={{
        position: 'fixed',
        left: menu.x,
        top: menu.y,
        zIndex: 1000,
        background: '#222227',
        border: '1px solid rgba(255,255,255,0.12)',
        borderRadius: 7,
        padding: 4,
        boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
        minWidth: 160,
      }}
    >
      {items.map((item) => (
        <button
          key={item.action}
          onClick={() => { onAction(item.action); onClose() }}
          className="flex w-full items-center"
          style={{
            height: 28,
            padding: '0 10px',
            fontSize: 12,
            color: '#ECECEC',
            background: 'transparent',
            border: 'none',
            borderRadius: 4,
            cursor: 'pointer',
            textAlign: 'left',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)' }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
        >
          {item.label}
        </button>
      ))}
    </div>
  )
}

export function DatabaseTree({ connectionId }: DatabaseTreeProps) {
  const [schemas, setSchemas] = useState<string[]>([])
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [tablesBySchema, setTablesBySchema] = useState<Record<string, TableInfo[]>>({})
  const [columnsByTable, setColumnsByTable] = useState<Record<string, ColumnInfo[]>>({})
  const [rowCountByTable, setRowCountByTable] = useState<Record<string, number>>({})
  const [loadingKeys, setLoadingKeys] = useState<Set<string>>(new Set())
  const [error, setError] = useState<string | null>(null)
  const [hoveredRow, setHoveredRow] = useState<string | null>(null)
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null)
  const { activeTabId, updateTabContent } = useEditorStore()

  const fetchRowCount = useCallback(async (schema: string, tables: TableInfo[]) => {
    // Lazily fetch row count estimates from pg_class for each table
    for (const table of tables) {
      try {
        const result = await invoke('query:execute', connectionId,
          `SELECT reltuples::bigint AS estimate FROM pg_class c
           JOIN pg_namespace n ON n.oid = c.relnamespace
           WHERE n.nspname = '${schema}' AND c.relname = '${table.name}'`
        )
        const estimate = result.rows[0]?.['estimate']
        if (estimate !== undefined && estimate !== null) {
          const key = `${schema}.${table.name}`
          setRowCountByTable((prev) => ({ ...prev, [key]: Number(estimate) }))
        }
      } catch {
        // silently ignore row count errors
      }
    }
  }, [connectionId])

  const loadSchema = useCallback(async () => {
    setSchemas([])
    setExpanded(new Set())
    setTablesBySchema({})
    setColumnsByTable({})
    setRowCountByTable({})
    setError(null)
    setLoadingKeys(new Set(['root']))
    try {
      const dbs = await invoke('schema:databases', connectionId)
      const db = dbs[0]
      if (!db) {
        setError('No databases found')
        return
      }
      let schemaList = await invoke('schema:schemas', connectionId, db)

      // Fallback: PostgreSQL always has "public" — if empty, default to it
      if (schemaList.length === 0) {
        schemaList = ['public']
      }

      setSchemas(schemaList)

      const defaultSchema = schemaList.includes('public') ? 'public' : schemaList[0]
      if (defaultSchema) {
        setExpanded(new Set([defaultSchema]))
        setLoadingKeys((prev) => new Set(prev).add(defaultSchema))
        try {
          const tables = await invoke('schema:tables', connectionId, defaultSchema)
          setTablesBySchema({ [defaultSchema]: tables })
          // Fetch row counts lazily (don't await — fire and forget)
          fetchRowCount(defaultSchema, tables)
        } finally {
          setLoadingKeys((prev) => { const n = new Set(prev); n.delete(defaultSchema); return n })
        }
      }
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoadingKeys((prev) => { const n = new Set(prev); n.delete('root'); return n })
    }
  }, [connectionId, fetchRowCount])

  useEffect(() => { loadSchema() }, [loadSchema])

  const loadTables = async (schema: string) => {
    if (tablesBySchema[schema]) return
    setLoadingKeys((prev) => new Set(prev).add(schema))
    try {
      const tables = await invoke('schema:tables', connectionId, schema)
      setTablesBySchema((prev) => ({ ...prev, [schema]: tables }))
      fetchRowCount(schema, tables)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoadingKeys((prev) => { const n = new Set(prev); n.delete(schema); return n })
    }
  }

  const loadColumns = async (schema: string, table: string) => {
    const key = `${schema}.${table}`
    if (columnsByTable[key]) return
    setLoadingKeys((prev) => new Set(prev).add(key))
    try {
      const columns = await invoke('schema:columns', connectionId, table)
      setColumnsByTable((prev) => ({ ...prev, [key]: columns }))
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoadingKeys((prev) => { const n = new Set(prev); n.delete(key); return n })
    }
  }

  const toggle = async (key: string, onExpand?: () => Promise<void>) => {
    const isExpanded = expanded.has(key)
    setExpanded((prev) => {
      const next = new Set(prev)
      if (isExpanded) next.delete(key)
      else next.add(key)
      return next
    })
    if (!isExpanded && onExpand) await onExpand()
  }

  const insertTableQuery = (schema: string, table: string) => {
    if (!activeTabId) return
    updateTabContent(activeTabId, `SELECT *\nFROM ${schema}.${table}\nLIMIT 100;`)
  }

  const handleContextMenu = (e: React.MouseEvent, schema: string, table: string) => {
    e.preventDefault()
    e.stopPropagation()
    setContextMenu({ x: e.clientX, y: e.clientY, schema, table })
  }

  const handleContextAction = (action: 'select100' | 'copyName' | 'countRows') => {
    if (!contextMenu) return
    const { schema, table } = contextMenu
    const fullName = `${schema}.${table}`
    switch (action) {
      case 'select100':
        if (activeTabId) updateTabContent(activeTabId, `SELECT * FROM ${fullName} LIMIT 100;`)
        break
      case 'countRows':
        if (activeTabId) updateTabContent(activeTabId, `SELECT COUNT(*) FROM ${fullName};`)
        break
      case 'copyName':
        navigator.clipboard.writeText(fullName).catch(() => {})
        break
    }
  }

  const formatRowCount = (n: number): string => {
    if (n < 0) return ''
    if (n >= 1_000_000) return `~${(n / 1_000_000).toFixed(1)}M`
    if (n >= 1_000) return `~${(n / 1_000).toFixed(0)}k`
    return String(n)
  }

  const isRefreshing = loadingKeys.has('root')

  const header = (
    <div
      className="flex items-center justify-between"
      style={{ padding: '6px 8px 4px', marginBottom: 2 }}
    >
      <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.09em', textTransform: 'uppercase', color: '#555560' }}>
        Schema
      </span>
      <button
        onClick={loadSchema}
        disabled={isRefreshing}
        title="Refresh schema"
        className="flex items-center justify-center rounded"
        style={{
          width: 16, height: 16,
          color: '#555560',
          background: 'none', border: 'none', cursor: 'pointer',
          transition: 'color 0.12s',
        }}
        onMouseEnter={(e) => e.currentTarget.style.color = '#ECECEC'}
        onMouseLeave={(e) => e.currentTarget.style.color = '#555560'}
      >
        <RefreshCw size={10} className={isRefreshing ? 'animate-spin' : ''} />
      </button>
    </div>
  )

  if (isRefreshing) {
    return (
      <>
        {header}
        <div className="flex items-center gap-2" style={{ padding: '4px 8px', color: '#555560' }}>
          <Loader2 size={11} className="animate-spin shrink-0" />
          <span style={{ fontSize: 12 }}>Loading schema...</span>
        </div>
      </>
    )
  }

  if (error) {
    return (
      <>
        {header}
        <div className="flex items-start gap-1.5" style={{ padding: '4px 8px', color: '#F87171' }}>
          <AlertCircle size={11} className="shrink-0" style={{ marginTop: 2 }} />
          <span className="break-all" style={{ fontSize: 12 }}>{error}</span>
        </div>
      </>
    )
  }

  if (schemas.length === 0) {
    return (
      <>
        {header}
        <div style={{ padding: '4px 8px', color: '#555560', fontSize: 12 }}>
          No schemas found
        </div>
      </>
    )
  }

  return (
    <div className="select-none" style={{ fontSize: 12 }}>
      {header}

      {contextMenu && (
        <ContextMenu
          menu={contextMenu}
          onClose={() => setContextMenu(null)}
          onAction={handleContextAction}
        />
      )}

      {schemas.map((schema) => (
        <div key={schema}>
          {/* Schema row — 26px, 0px indent */}
          <button
            onClick={() => toggle(schema, () => loadTables(schema))}
            onMouseEnter={() => setHoveredRow(`schema:${schema}`)}
            onMouseLeave={() => setHoveredRow(null)}
            className="flex w-full items-center gap-1"
            style={{
              height: 26,
              paddingLeft: 8,
              paddingRight: 8,
              color: '#8B8B8B',
              background: hoveredRow === `schema:${schema}` ? 'rgba(255,255,255,0.04)' : 'transparent',
              border: 'none',
              cursor: 'pointer',
              transition: 'background 0.1s',
            }}
          >
            {loadingKeys.has(schema)
              ? <Loader2 size={11} className="animate-spin shrink-0" />
              : expanded.has(schema)
                ? <ChevronDown size={11} className="shrink-0" />
                : <ChevronRight size={11} className="shrink-0" />}
            <Database size={11} className="shrink-0" style={{ color: '#5B8AF0' }} />
            <span style={{ fontWeight: 500 }} className="truncate">{schema}</span>
          </button>

          {expanded.has(schema) && (tablesBySchema[schema] ?? []).map((table) => {
            const tableKey = `${schema}.${table.name}`
            const rowCount = rowCountByTable[tableKey]
            return (
              <div key={table.name}>
                {/* Table row — 26px, 16px indent */}
                <button
                  onClick={() => toggle(tableKey, () => loadColumns(schema, table.name))}
                  onDoubleClick={() => insertTableQuery(schema, table.name)}
                  onContextMenu={(e) => handleContextMenu(e, schema, table.name)}
                  onMouseEnter={() => setHoveredRow(`table:${tableKey}`)}
                  onMouseLeave={() => setHoveredRow(null)}
                  className="flex w-full items-center gap-1"
                  style={{
                    height: 26,
                    paddingLeft: 16,
                    paddingRight: 8,
                    color: '#ECECEC',
                    background: hoveredRow === `table:${tableKey}` ? 'rgba(255,255,255,0.04)' : 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'background 0.1s',
                  }}
                  title="Double-click to SELECT * | Right-click for options"
                >
                  {loadingKeys.has(tableKey)
                    ? <Loader2 size={10} className="animate-spin shrink-0" />
                    : expanded.has(tableKey)
                      ? <ChevronDown size={10} className="shrink-0" />
                      : <ChevronRight size={10} className="shrink-0" />}
                  <Table2
                    size={11}
                    className="shrink-0"
                    style={{ color: table.type === 'view' ? '#5B8AF0' : '#F97316' }}
                  />
                  <span className="truncate">{table.name}</span>
                  {rowCount !== undefined && (
                    <span className="ml-auto shrink-0" style={{ fontSize: 10, color: '#555560', marginLeft: 4 }}>
                      {formatRowCount(rowCount)}
                    </span>
                  )}
                </button>

                {expanded.has(tableKey) && (columnsByTable[tableKey] ?? []).map((col) => (
                  /* Column row — 24px, 32px indent */
                  <div
                    key={col.name}
                    className="flex items-center gap-1"
                    onMouseEnter={() => setHoveredRow(`col:${tableKey}.${col.name}`)}
                    onMouseLeave={() => setHoveredRow(null)}
                    style={{
                      height: 24,
                      paddingLeft: 32,
                      paddingRight: 8,
                      background: hoveredRow === `col:${tableKey}.${col.name}` ? 'rgba(255,255,255,0.04)' : 'transparent',
                      transition: 'background 0.1s',
                    }}
                  >
                    {/* Key icon for PK, arrow for FK, or column icon */}
                    {col.isPrimaryKey ? (
                      <Key size={9} className="shrink-0" style={{ color: '#FBBF24' }} />
                    ) : col.isForeignKey ? (
                      <span style={{ fontSize: 9, color: '#F97316', lineHeight: 1, flexShrink: 0 }}>→</span>
                    ) : (
                      <span style={{ width: 9, flexShrink: 0, display: 'inline-block' }} />
                    )}

                    {/* Column name */}
                    <span
                      className="truncate"
                      style={{
                        color: col.isPrimaryKey ? '#FBBF24' : col.isForeignKey ? '#F97316' : '#ECECEC',
                        fontSize: 11,
                        fontWeight: col.isPrimaryKey ? 600 : 400,
                      }}
                    >
                      {col.name}
                    </span>

                    {/* NOT NULL indicator */}
                    {!col.nullable && (
                      <span
                        title="NOT NULL"
                        style={{
                          fontSize: 9,
                          color: '#F87171',
                          fontWeight: 700,
                          marginLeft: 2,
                          flexShrink: 0,
                        }}
                      >
                        !
                      </span>
                    )}

                    {/* Nullable indicator */}
                    {col.nullable && (
                      <span
                        title="Nullable"
                        style={{
                          fontSize: 9,
                          color: '#555560',
                          marginLeft: 2,
                          flexShrink: 0,
                        }}
                      >
                        ?
                      </span>
                    )}

                    {/* Data type */}
                    <span className="ml-auto shrink-0" style={{ fontSize: 10, color: '#555560' }}>
                      {col.type}
                    </span>
                  </div>
                ))}
              </div>
            )
          })}
        </div>
      ))}
    </div>
  )
}
