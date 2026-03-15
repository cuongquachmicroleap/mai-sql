import { useState, useEffect, useCallback, useRef } from 'react'
import { ChevronRight, ChevronDown, Database, Table2, Loader2, AlertCircle, RefreshCw, Key, FunctionSquare, List, Zap } from 'lucide-react'
import { invoke } from '../../lib/ipc-client'
import { useEditorStore } from '../../stores/editor-store'
import type { TableInfo, ColumnInfo, FunctionInfo, IndexInfo, TriggerInfo } from '@shared/types/schema'

interface DatabaseTreeProps {
  connectionId: string
}

interface ContextMenuState {
  x: number
  y: number
  schema: string
  table: string
}

function ContextMenu({
  menu, onClose, onAction,
}: {
  menu: ContextMenuState
  onClose: () => void
  onAction: (action: 'select100' | 'copyName' | 'countRows') => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
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
    <div ref={ref} style={{ position: 'fixed', left: menu.x, top: menu.y, zIndex: 1000, background: '#222227', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 7, padding: 4, boxShadow: '0 8px 32px rgba(0,0,0,0.5)', minWidth: 160 }}>
      {items.map((item) => (
        <button key={item.action} onClick={() => { onAction(item.action); onClose() }} className="flex w-full items-center"
          style={{ height: 28, padding: '0 10px', fontSize: 12, color: '#ECECEC', background: 'transparent', border: 'none', borderRadius: 4, cursor: 'pointer', textAlign: 'left' }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)' }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
        >{item.label}</button>
      ))}
    </div>
  )
}

function SectionRow({ label, icon, expanded, loading, onClick, indent }: {
  label: string; icon: React.ReactNode; expanded: boolean; loading: boolean; onClick: () => void; indent: number
}) {
  const [hovered, setHovered] = useState(false)
  return (
    <button onClick={onClick} onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
      className="flex w-full items-center gap-1"
      style={{ height: 22, paddingLeft: indent, paddingRight: 8, color: '#6B6B7B', background: hovered ? 'rgba(255,255,255,0.03)' : 'transparent', border: 'none', cursor: 'pointer' }}
    >
      {loading ? <Loader2 size={9} className="animate-spin shrink-0" /> : expanded ? <ChevronDown size={9} className="shrink-0" /> : <ChevronRight size={9} className="shrink-0" />}
      <span style={{ marginLeft: 1 }}>{icon}</span>
      <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>{label}</span>
    </button>
  )
}

export function DatabaseTree({ connectionId }: DatabaseTreeProps) {
  const [schemas, setSchemas] = useState<string[]>([])
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [tablesBySchema, setTablesBySchema] = useState<Record<string, TableInfo[]>>({})
  const [columnsByTable, setColumnsByTable] = useState<Record<string, ColumnInfo[]>>({})
  const [indexesByTable, setIndexesByTable] = useState<Record<string, IndexInfo[]>>({})
  const [triggersByTable, setTriggersByTable] = useState<Record<string, TriggerInfo[]>>({})
  const [functionsBySchema, setFunctionsBySchema] = useState<Record<string, FunctionInfo[]>>({})
  const [rowCountByTable, setRowCountByTable] = useState<Record<string, number>>({})
  const [loadingKeys, setLoadingKeys] = useState<Set<string>>(new Set())
  const [error, setError] = useState<string | null>(null)
  const [hoveredRow, setHoveredRow] = useState<string | null>(null)
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null)
  const { activeTabId, updateTabContent } = useEditorStore()

  const fetchRowCount = useCallback(async (schema: string, tables: TableInfo[]) => {
    for (const table of tables) {
      try {
        const result = await invoke('query:execute', connectionId,
          `SELECT reltuples::bigint AS estimate FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = '${schema}' AND c.relname = '${table.name}'`)
        const estimate = result.rows[0]?.['estimate']
        if (estimate !== undefined && estimate !== null)
          setRowCountByTable((prev) => ({ ...prev, [`${schema}.${table.name}`]: Number(estimate) }))
      } catch { /* silently ignore */ }
    }
  }, [connectionId])

  const loadSchema = useCallback(async () => {
    setSchemas([]); setExpanded(new Set()); setTablesBySchema({}); setColumnsByTable({})
    setIndexesByTable({}); setTriggersByTable({}); setFunctionsBySchema({}); setRowCountByTable({})
    setError(null); setLoadingKeys(new Set(['root']))
    try {
      const dbs = await invoke('schema:databases', connectionId)
      const db = dbs[0]
      if (!db) { setError('No databases found'); return }
      let schemaList = await invoke('schema:schemas', connectionId, db)
      if (schemaList.length === 0) schemaList = ['public']
      setSchemas(schemaList)
      const defaultSchema = schemaList[0]
      if (defaultSchema) {
        setExpanded(new Set([defaultSchema, `${defaultSchema}:tables`]))
        setLoadingKeys((prev) => new Set(prev).add(defaultSchema))
        try {
          const tables = await invoke('schema:tables', connectionId, defaultSchema)
          setTablesBySchema({ [defaultSchema]: tables })
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
    if (tablesBySchema[schema]?.length) return
    setLoadingKeys((prev) => new Set(prev).add(schema))
    try {
      const tables = await invoke('schema:tables', connectionId, schema)
      setTablesBySchema((prev) => ({ ...prev, [schema]: tables }))
      fetchRowCount(schema, tables)
    } catch {
      setTablesBySchema((prev) => ({ ...prev, [schema]: [] }))
    } finally {
      setLoadingKeys((prev) => { const n = new Set(prev); n.delete(schema); return n })
    }
  }

  const loadColumns = async (schema: string, table: string) => {
    const key = `${schema}.${table}`
    if (columnsByTable[key]?.length) return
    setLoadingKeys((prev) => new Set(prev).add(key))
    try {
      const columns = await invoke('schema:columns', connectionId, table, schema)
      setColumnsByTable((prev) => ({ ...prev, [key]: columns }))
    } catch {
      setColumnsByTable((prev) => ({ ...prev, [key]: [] }))
    } finally {
      setLoadingKeys((prev) => { const n = new Set(prev); n.delete(key); return n })
    }
  }

  const loadIndexes = async (schema: string, table: string) => {
    const key = `${schema}.${table}`
    if (indexesByTable[key] !== undefined) return
    const loadKey = `${key}:indexes`
    setLoadingKeys((prev) => new Set(prev).add(loadKey))
    try {
      const indexes = await invoke('schema:indexes', connectionId, table, schema)
      setIndexesByTable((prev) => ({ ...prev, [key]: indexes }))
    } catch {
      setIndexesByTable((prev) => ({ ...prev, [key]: [] }))
    } finally {
      setLoadingKeys((prev) => { const n = new Set(prev); n.delete(loadKey); return n })
    }
  }

  const loadTriggers = async (schema: string, table: string) => {
    const key = `${schema}.${table}`
    if (triggersByTable[key] !== undefined) return
    const loadKey = `${key}:triggers`
    setLoadingKeys((prev) => new Set(prev).add(loadKey))
    try {
      const triggers = await invoke('schema:triggers', connectionId, table, schema)
      setTriggersByTable((prev) => ({ ...prev, [key]: triggers }))
    } catch {
      setTriggersByTable((prev) => ({ ...prev, [key]: [] }))
    } finally {
      setLoadingKeys((prev) => { const n = new Set(prev); n.delete(loadKey); return n })
    }
  }

  const loadFunctions = async (schema: string) => {
    if (functionsBySchema[schema] !== undefined) return
    const key = `${schema}:functions`
    setLoadingKeys((prev) => new Set(prev).add(key))
    try {
      const fns = await invoke('schema:functions', connectionId, schema)
      setFunctionsBySchema((prev) => ({ ...prev, [schema]: fns }))
    } catch {
      setFunctionsBySchema((prev) => ({ ...prev, [schema]: [] }))
    } finally {
      setLoadingKeys((prev) => { const n = new Set(prev); n.delete(key); return n })
    }
  }

  const toggle = async (key: string, onExpand?: () => Promise<void>) => {
    const isExpanded = expanded.has(key)
    setExpanded((prev) => { const next = new Set(prev); if (isExpanded) next.delete(key); else next.add(key); return next })
    if (!isExpanded && onExpand) await onExpand()
  }

  const insertTableQuery = (schema: string, table: string) => {
    if (!activeTabId) return
    updateTabContent(activeTabId, `SELECT *\nFROM ${schema}.${table}\nLIMIT 100;`)
  }

  const handleContextMenu = (e: React.MouseEvent, schema: string, table: string) => {
    e.preventDefault(); e.stopPropagation()
    setContextMenu({ x: e.clientX, y: e.clientY, schema, table })
  }

  const handleContextAction = (action: 'select100' | 'copyName' | 'countRows') => {
    if (!contextMenu) return
    const { schema, table } = contextMenu
    const fullName = `${schema}.${table}`
    switch (action) {
      case 'select100': if (activeTabId) updateTabContent(activeTabId, `SELECT * FROM ${fullName} LIMIT 100;`); break
      case 'countRows': if (activeTabId) updateTabContent(activeTabId, `SELECT COUNT(*) FROM ${fullName};`); break
      case 'copyName': navigator.clipboard.writeText(fullName).catch(() => {}); break
    }
  }

  const formatRowCount = (n: number) => {
    if (n < 0) return ''
    if (n >= 1_000_000) return `~${(n / 1_000_000).toFixed(1)}M`
    if (n >= 1_000) return `~${(n / 1_000).toFixed(0)}k`
    return String(n)
  }

  const emptyHint = (msg: string, indent = 52) => (
    <div style={{ paddingLeft: indent, paddingRight: 8, height: 20, display: 'flex', alignItems: 'center', gap: 4, color: '#555560', fontSize: 10 }}>
      <AlertCircle size={8} /><span>{msg}</span>
    </div>
  )

  const isRefreshing = loadingKeys.has('root')

  const header = (
    <div className="flex items-center justify-between" style={{ padding: '6px 8px 4px', marginBottom: 2 }}>
      <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.09em', textTransform: 'uppercase', color: '#555560' }}>Schema</span>
      <button onClick={loadSchema} disabled={isRefreshing} title="Refresh schema" className="flex items-center justify-center rounded"
        style={{ width: 16, height: 16, color: '#555560', background: 'none', border: 'none', cursor: 'pointer', transition: 'color 0.12s' }}
        onMouseEnter={(e) => e.currentTarget.style.color = '#ECECEC'}
        onMouseLeave={(e) => e.currentTarget.style.color = '#555560'}
      ><RefreshCw size={10} className={isRefreshing ? 'animate-spin' : ''} /></button>
    </div>
  )

  if (isRefreshing) return (
    <>{header}<div className="flex items-center gap-2" style={{ padding: '4px 8px', color: '#555560' }}><Loader2 size={11} className="animate-spin shrink-0" /><span style={{ fontSize: 12 }}>Loading schema...</span></div></>
  )
  if (error) return (
    <>{header}<div className="flex items-start gap-1.5" style={{ padding: '4px 8px', color: '#F87171' }}><AlertCircle size={11} className="shrink-0" style={{ marginTop: 2 }} /><span className="break-all" style={{ fontSize: 12 }}>{error}</span></div></>
  )
  if (schemas.length === 0) return (
    <>{header}<div style={{ padding: '4px 8px', color: '#555560', fontSize: 12 }}>No schemas found</div></>
  )

  return (
    <div className="select-none" style={{ fontSize: 12 }}>
      {header}
      {contextMenu && <ContextMenu menu={contextMenu} onClose={() => setContextMenu(null)} onAction={handleContextAction} />}

      {schemas.map((schema) => {
        const tables = tablesBySchema[schema] ?? []
        const functions = functionsBySchema[schema] ?? []

        return (
          <div key={schema}>
            {/* Schema row */}
            <button
              onClick={() => toggle(schema, () => loadTables(schema))}
              onMouseEnter={() => setHoveredRow(`schema:${schema}`)}
              onMouseLeave={() => setHoveredRow(null)}
              className="flex w-full items-center gap-1"
              style={{ height: 26, paddingLeft: 8, paddingRight: 8, color: '#8B8B8B', background: hoveredRow === `schema:${schema}` ? 'rgba(255,255,255,0.04)' : 'transparent', border: 'none', cursor: 'pointer', transition: 'background 0.1s' }}
            >
              {loadingKeys.has(schema) ? <Loader2 size={11} className="animate-spin shrink-0" /> : expanded.has(schema) ? <ChevronDown size={11} className="shrink-0" /> : <ChevronRight size={11} className="shrink-0" />}
              <Database size={11} className="shrink-0" style={{ color: '#5B8AF0' }} />
              <span style={{ fontWeight: 500 }} className="truncate">{schema}</span>
            </button>

            {expanded.has(schema) && (<>
              {/* ── Tables section ── */}
              <SectionRow label="Tables" icon={<Table2 size={9} style={{ color: '#F97316' }} />}
                expanded={expanded.has(`${schema}:tables`)} loading={loadingKeys.has(schema)}
                onClick={() => toggle(`${schema}:tables`, () => loadTables(schema))} indent={16} />

              {expanded.has(`${schema}:tables`) && (tables.length === 0
                ? emptyHint('No tables found', 28)
                : tables.map((table) => {
                  const tableKey = `${schema}.${table.name}`
                  const rowCount = rowCountByTable[tableKey]
                  const indexes = indexesByTable[tableKey] ?? []
                  const triggers = triggersByTable[tableKey] ?? []

                  return (
                    <div key={table.name}>
                      {/* Table row */}
                      <button
                        onClick={() => toggle(tableKey, () => loadColumns(schema, table.name))}
                        onDoubleClick={() => insertTableQuery(schema, table.name)}
                        onContextMenu={(e) => handleContextMenu(e, schema, table.name)}
                        onMouseEnter={() => setHoveredRow(`table:${tableKey}`)}
                        onMouseLeave={() => setHoveredRow(null)}
                        className="flex w-full items-center gap-1"
                        style={{ height: 24, paddingLeft: 28, paddingRight: 8, color: '#ECECEC', background: hoveredRow === `table:${tableKey}` ? 'rgba(255,255,255,0.04)' : 'transparent', border: 'none', cursor: 'pointer', transition: 'background 0.1s' }}
                        title="Double-click to SELECT * | Right-click for options"
                      >
                        {loadingKeys.has(tableKey) ? <Loader2 size={10} className="animate-spin shrink-0" /> : expanded.has(tableKey) ? <ChevronDown size={10} className="shrink-0" /> : <ChevronRight size={10} className="shrink-0" />}
                        <Table2 size={10} className="shrink-0" style={{ color: table.type === 'view' ? '#5B8AF0' : '#F97316' }} />
                        <span className="truncate" style={{ fontSize: 11 }}>{table.name}</span>
                        {rowCount !== undefined && <span className="ml-auto shrink-0" style={{ fontSize: 10, color: '#555560' }}>{formatRowCount(rowCount)}</span>}
                      </button>

                      {expanded.has(tableKey) && (<>
                        {/* Columns */}
                        {(columnsByTable[tableKey] ?? []).map((col) => (
                          <div key={col.name} className="flex items-center gap-1"
                            onMouseEnter={() => setHoveredRow(`col:${tableKey}.${col.name}`)}
                            onMouseLeave={() => setHoveredRow(null)}
                            style={{ height: 21, paddingLeft: 40, paddingRight: 8, background: hoveredRow === `col:${tableKey}.${col.name}` ? 'rgba(255,255,255,0.04)' : 'transparent', transition: 'background 0.1s' }}
                          >
                            {col.isPrimaryKey ? <Key size={9} className="shrink-0" style={{ color: '#FBBF24' }} />
                              : col.isForeignKey ? <span style={{ fontSize: 9, color: '#F97316', lineHeight: 1, flexShrink: 0 }}>→</span>
                              : <span style={{ width: 9, flexShrink: 0, display: 'inline-block' }} />}
                            <span className="truncate" style={{ color: col.isPrimaryKey ? '#FBBF24' : col.isForeignKey ? '#F97316' : '#ECECEC', fontSize: 11, fontWeight: col.isPrimaryKey ? 600 : 400 }}>{col.name}</span>
                            {!col.nullable && <span title="NOT NULL" style={{ fontSize: 9, color: '#F87171', fontWeight: 700, marginLeft: 2, flexShrink: 0 }}>!</span>}
                            {col.nullable && <span title="Nullable" style={{ fontSize: 9, color: '#555560', marginLeft: 2, flexShrink: 0 }}>?</span>}
                            <span className="ml-auto shrink-0" style={{ fontSize: 10, color: '#555560', fontFamily: 'monospace' }}>{col.displayType}</span>
                          </div>
                        ))}

                        {/* Indexes sub-section */}
                        <SectionRow label="Indexes" icon={<List size={9} style={{ color: '#6EE7B7' }} />}
                          expanded={expanded.has(`${tableKey}:indexes`)} loading={loadingKeys.has(`${tableKey}:indexes`)}
                          onClick={() => toggle(`${tableKey}:indexes`, () => loadIndexes(schema, table.name))} indent={40} />

                        {expanded.has(`${tableKey}:indexes`) && (indexes.length === 0
                          ? emptyHint('No indexes')
                          : indexes.map((idx) => (
                            <div key={idx.name} onMouseEnter={() => setHoveredRow(`idx:${tableKey}.${idx.name}`)} onMouseLeave={() => setHoveredRow(null)}
                              className="flex items-center gap-1"
                              style={{ height: 20, paddingLeft: 52, paddingRight: 8, background: hoveredRow === `idx:${tableKey}.${idx.name}` ? 'rgba(255,255,255,0.04)' : 'transparent', transition: 'background 0.1s' }}
                            >
                              <List size={8} className="shrink-0" style={{ color: idx.isPrimary ? '#FBBF24' : idx.isUnique ? '#6EE7B7' : '#555560' }} />
                              <span className="truncate" style={{ fontSize: 10, color: '#ECECEC' }}>{idx.name}</span>
                              <span className="ml-auto shrink-0" style={{ fontSize: 9, color: '#555560', fontFamily: 'monospace' }}>{idx.columns.join(', ')}</span>
                            </div>
                          ))
                        )}

                        {/* Triggers sub-section */}
                        <SectionRow label="Triggers" icon={<Zap size={9} style={{ color: '#FCD34D' }} />}
                          expanded={expanded.has(`${tableKey}:triggers`)} loading={loadingKeys.has(`${tableKey}:triggers`)}
                          onClick={() => toggle(`${tableKey}:triggers`, () => loadTriggers(schema, table.name))} indent={40} />

                        {expanded.has(`${tableKey}:triggers`) && (triggers.length === 0
                          ? emptyHint('No triggers')
                          : triggers.map((trg) => (
                            <div key={trg.name} onMouseEnter={() => setHoveredRow(`trg:${tableKey}.${trg.name}`)} onMouseLeave={() => setHoveredRow(null)}
                              className="flex items-center gap-1"
                              style={{ height: 20, paddingLeft: 52, paddingRight: 8, background: hoveredRow === `trg:${tableKey}.${trg.name}` ? 'rgba(255,255,255,0.04)' : 'transparent', transition: 'background 0.1s' }}
                            >
                              <Zap size={8} className="shrink-0" style={{ color: '#FCD34D' }} />
                              <span className="truncate" style={{ fontSize: 10, color: '#ECECEC' }}>{trg.name}</span>
                              <span className="ml-auto shrink-0" style={{ fontSize: 9, color: '#555560' }}>{trg.timing} {trg.event}</span>
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
                expanded={expanded.has(`${schema}:functions`)} loading={loadingKeys.has(`${schema}:functions`)}
                onClick={() => toggle(`${schema}:functions`, () => loadFunctions(schema))} indent={16} />

              {expanded.has(`${schema}:functions`) && (functions.length === 0
                ? emptyHint('No functions found', 28)
                : functions.map((fn) => (
                  <div key={fn.name} onMouseEnter={() => setHoveredRow(`fn:${schema}.${fn.name}`)} onMouseLeave={() => setHoveredRow(null)}
                    className="flex items-center gap-1"
                    style={{ height: 22, paddingLeft: 28, paddingRight: 8, background: hoveredRow === `fn:${schema}.${fn.name}` ? 'rgba(255,255,255,0.04)' : 'transparent', transition: 'background 0.1s' }}
                  >
                    <FunctionSquare size={9} className="shrink-0" style={{ color: fn.kind === 'procedure' ? '#34D399' : '#A78BFA' }} />
                    <span className="truncate" style={{ fontSize: 11, color: '#ECECEC' }}>{fn.name}</span>
                    <span className="ml-auto shrink-0" style={{ fontSize: 10, color: '#555560', fontFamily: 'monospace' }}>{fn.returnType || fn.language}</span>
                  </div>
                ))
              )}
            </>)}
          </div>
        )
      })}
    </div>
  )
}
