import { useState, useEffect } from 'react'
import { ChevronRight, ChevronDown, Database, Table2, Columns3, Loader2, AlertCircle } from 'lucide-react'
import { invoke } from '../../lib/ipc-client'
import { useEditorStore } from '../../stores/editor-store'
import type { TableInfo, ColumnInfo } from '@shared/types/schema'
import { cn } from '../../lib/utils'

interface DatabaseTreeProps {
  connectionId: string
}

export function DatabaseTree({ connectionId }: DatabaseTreeProps) {
  const [schemas, setSchemas] = useState<string[]>([])
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [tablesBySchema, setTablesBySchema] = useState<Record<string, TableInfo[]>>({})
  const [columnsByTable, setColumnsByTable] = useState<Record<string, ColumnInfo[]>>({})
  const [loadingKeys, setLoadingKeys] = useState<Set<string>>(new Set())
  const [error, setError] = useState<string | null>(null)
  const { activeTabId, updateTabContent } = useEditorStore()

  useEffect(() => {
    setSchemas([])
    setExpanded(new Set())
    setTablesBySchema({})
    setColumnsByTable({})
    setError(null)

    const load = async () => {
      setLoadingKeys((prev) => new Set(prev).add('root'))
      try {
        const dbs = await invoke('schema:databases', connectionId)
        const db = dbs[0]
        if (!db) {
          setError('No databases found')
          return
        }
        const schemaList = await invoke('schema:schemas', connectionId, db)
        setSchemas(schemaList)

        // Auto-expand 'public' schema and load its tables
        const defaultSchema = schemaList.includes('public') ? 'public' : schemaList[0]
        if (defaultSchema) {
          setExpanded(new Set([defaultSchema]))
          setLoadingKeys((prev) => new Set(prev).add(defaultSchema))
          try {
            const tables = await invoke('schema:tables', connectionId, defaultSchema)
            setTablesBySchema({ [defaultSchema]: tables })
          } finally {
            setLoadingKeys((prev) => { const n = new Set(prev); n.delete(defaultSchema); return n })
          }
        }
      } catch (err) {
        setError((err as Error).message)
      } finally {
        setLoadingKeys((prev) => { const n = new Set(prev); n.delete('root'); return n })
      }
    }
    load()
  }, [connectionId])

  const loadTables = async (schema: string) => {
    if (tablesBySchema[schema]) return
    setLoadingKeys((prev) => new Set(prev).add(schema))
    try {
      const tables = await invoke('schema:tables', connectionId, schema)
      setTablesBySchema((prev) => ({ ...prev, [schema]: tables }))
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

  if (loadingKeys.has('root')) {
    return (
      <div className="flex items-center gap-2 px-2 py-2" style={{ color: 'var(--color-muted-foreground)' }}>
        <Loader2 size={11} className="animate-spin shrink-0" />
        <span className="text-xs">Loading schema...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-start gap-1.5 px-2 py-2" style={{ color: 'var(--color-destructive)' }}>
        <AlertCircle size={11} className="shrink-0 mt-0.5" />
        <span className="text-xs break-all">{error}</span>
      </div>
    )
  }

  if (schemas.length === 0) {
    return (
      <div className="px-2 py-2" style={{ color: 'var(--color-muted-foreground)', fontSize: 11 }}>
        No schemas found
      </div>
    )
  }

  return (
    <div className="select-none" style={{ fontSize: 12 }}>
      {schemas.map((schema) => (
        <div key={schema}>
          <button
            onClick={() => toggle(schema, () => loadTables(schema))}
            className="flex w-full items-center gap-1 px-2 py-0.5 transition-colors"
            style={{ color: 'var(--color-muted-foreground)' }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-muted)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          >
            {loadingKeys.has(schema)
              ? <Loader2 size={11} className="animate-spin shrink-0" />
              : expanded.has(schema)
                ? <ChevronDown size={11} className="shrink-0" />
                : <ChevronRight size={11} className="shrink-0" />}
            <Database size={11} className="shrink-0" />
            <span className="font-medium truncate">{schema}</span>
          </button>

          {expanded.has(schema) && (tablesBySchema[schema] ?? []).map((table) => {
            const tableKey = `${schema}.${table.name}`
            return (
              <div key={table.name}>
                <button
                  onClick={() => toggle(tableKey, () => loadColumns(schema, table.name))}
                  onDoubleClick={() => insertTableQuery(schema, table.name)}
                  className="flex w-full items-center gap-1 py-0.5 pl-5 pr-2 transition-colors"
                  style={{ color: 'var(--color-muted-foreground)' }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-muted)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  title="Double-click to SELECT * from this table"
                >
                  {loadingKeys.has(tableKey)
                    ? <Loader2 size={10} className="animate-spin shrink-0" />
                    : expanded.has(tableKey)
                      ? <ChevronDown size={10} className="shrink-0" />
                      : <ChevronRight size={10} className="shrink-0" />}
                  <Table2
                    size={11}
                    className="shrink-0"
                    style={{ color: table.type === 'view' ? '#60a5fa' : '#f97316' }}
                  />
                  <span className="truncate" style={{ color: 'var(--color-foreground)' }}>{table.name}</span>
                </button>

                {expanded.has(tableKey) && (columnsByTable[tableKey] ?? []).map((col) => (
                  <div
                    key={col.name}
                    className="flex items-center gap-1 py-0.5 pl-10 pr-2"
                    style={{ color: 'var(--color-muted-foreground)' }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-muted)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <Columns3 size={10} className="shrink-0" />
                    <span
                      className={cn('truncate', col.isPrimaryKey && 'font-semibold')}
                      style={{ color: col.isPrimaryKey ? '#eab308' : col.isForeignKey ? '#f97316' : 'var(--color-foreground)', fontSize: 11 }}
                    >
                      {col.name}
                    </span>
                    <span className="ml-auto shrink-0" style={{ fontSize: 10, color: 'var(--color-muted-foreground)' }}>{col.type}</span>
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
