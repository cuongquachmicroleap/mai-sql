import { useState, useEffect } from 'react'
import { ChevronRight, ChevronDown, Database, Table2, Columns3 } from 'lucide-react'
import { invoke } from '../../lib/ipc-client'
import { useEditorStore } from '../../stores/editor-store'
import type { TableInfo, ColumnInfo } from '@shared/types/schema'
import { cn } from '../../lib/utils'

interface DatabaseTreeProps {
  connectionId: string
}

export function DatabaseTree({ connectionId }: DatabaseTreeProps) {
  const [schemas, setSchemas] = useState<string[]>([])
  const [expanded, setExpanded] = useState<Set<string>>(new Set(['public']))
  const [tablesBySchema, setTablesBySchema] = useState<Record<string, TableInfo[]>>({})
  const [columnsByTable, setColumnsByTable] = useState<Record<string, ColumnInfo[]>>({})
  const { activeTabId, updateTabContent } = useEditorStore()

  useEffect(() => {
    invoke('schema:databases', connectionId).then((dbs) => {
      if (dbs[0]) {
        invoke('schema:schemas', connectionId, dbs[0]).then(setSchemas)
      }
    })
  }, [connectionId])

  const loadTables = async (schema: string) => {
    if (tablesBySchema[schema]) return
    const tables = await invoke('schema:tables', connectionId, schema)
    setTablesBySchema((prev) => ({ ...prev, [schema]: tables }))
  }

  const loadColumns = async (schema: string, table: string) => {
    const key = `${schema}.${table}`
    if (columnsByTable[key]) return
    const columns = await invoke('schema:columns', connectionId, table)
    setColumnsByTable((prev) => ({ ...prev, [key]: columns }))
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

  return (
    <div className="select-none text-sm">
      {schemas.map((schema) => (
        <div key={schema}>
          <button
            onClick={() => toggle(schema, () => loadTables(schema))}
            className="flex w-full items-center gap-1 px-2 py-1 hover:bg-muted"
          >
            {expanded.has(schema)
              ? <ChevronDown className="h-3.5 w-3.5 shrink-0" />
              : <ChevronRight className="h-3.5 w-3.5 shrink-0" />}
            <Database className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <span className="font-medium">{schema}</span>
          </button>

          {expanded.has(schema) && (tablesBySchema[schema] ?? []).map((table) => {
            const tableKey = `${schema}.${table.name}`
            return (
              <div key={table.name}>
                <button
                  onClick={() => toggle(tableKey, () => loadColumns(schema, table.name))}
                  onDoubleClick={() => insertTableQuery(schema, table.name)}
                  className="flex w-full items-center gap-1 py-0.5 pl-6 pr-2 hover:bg-muted"
                >
                  {expanded.has(tableKey)
                    ? <ChevronDown className="h-3 w-3 shrink-0" />
                    : <ChevronRight className="h-3 w-3 shrink-0" />}
                  <Table2 className={cn('h-3.5 w-3.5 shrink-0', table.type === 'view' ? 'text-blue-500' : 'text-orange-500')} />
                  <span>{table.name}</span>
                </button>

                {expanded.has(tableKey) && (columnsByTable[tableKey] ?? []).map((col) => (
                  <div
                    key={col.name}
                    className="flex items-center gap-1 py-0.5 pl-12 pr-2 text-xs text-muted-foreground hover:bg-muted"
                  >
                    <Columns3 className="h-3 w-3 shrink-0" />
                    <span className={cn(col.isPrimaryKey && 'text-yellow-500 font-medium')}>{col.name}</span>
                    <span className="ml-auto text-[10px]">{col.type}</span>
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
