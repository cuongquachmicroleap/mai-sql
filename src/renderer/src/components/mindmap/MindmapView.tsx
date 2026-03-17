import { useState, useEffect, useCallback } from 'react'
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  type NodeTypes,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { Loader2, AlertCircle, RefreshCw } from 'lucide-react'
import { invoke } from '../../lib/ipc-client'
import { useConnectionStore } from '../../stores/connection-store'
import { useEditorStore } from '../../stores/editor-store'
import { getLayoutedElements } from './layout'
import { EDGE_STYLE } from './styles'
import { DatabaseNode } from './nodes/DatabaseNode'
import { SchemaNode } from './nodes/SchemaNode'
import { TableNode } from './nodes/TableNode'
import type { TableInfo } from '@shared/types/schema'

const nodeTypes: NodeTypes = {
  database: DatabaseNode,
  schema: SchemaNode,
  table: TableNode,
}

interface MindmapViewProps {
  scopeDatabase?: string
  scopeSchema?: string
}

export function MindmapView({ scopeDatabase }: MindmapViewProps) {
  const { activeConnectionId } = useConnectionStore()
  const connectionId = activeConnectionId

  const [databases, setDatabases] = useState<string[]>([])
  const [defaultDb, setDefaultDb] = useState('postgres')
  const [schemasMap, setSchemasMap] = useState<Record<string, string[]>>({})
  const [tablesMap, setTablesMap] = useState<Record<string, TableInfo[]>>({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [nodes, setNodes, onNodesChange] = useNodesState([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])

  // Load all databases, schemas, and tables
  const loadData = useCallback(async () => {
    if (!connectionId) return
    setLoading(true)
    setError(null)
    try {
      const [allDbs, defDb] = await Promise.all([
        invoke('schema:databases', connectionId),
        invoke('schema:default-database', connectionId),
      ])
      if (allDbs.length === 0) { setError('No databases found'); return }

      const dbs = scopeDatabase ? allDbs.filter((db) => db === scopeDatabase) : allDbs
      setDatabases(dbs)
      setDefaultDb(defDb)

      // Load schemas for each database
      const newSchemas: Record<string, string[]> = {}
      const newTables: Record<string, TableInfo[]> = {}

      for (const db of dbs) {
        try {
          let schemaList = await invoke('schema:schemas', connectionId, db)
          if (schemaList.length === 0) schemaList = ['public']
          newSchemas[db] = schemaList

          // Load tables for each schema
          for (const schema of schemaList) {
            try {
              const tables = await invoke('schema:tables', connectionId, schema, db)
              newTables[`${db}/${schema}`] = tables
            } catch {
              newTables[`${db}/${schema}`] = []
            }
          }
        } catch {
          newSchemas[db] = []
        }
      }

      setSchemasMap(newSchemas)
      setTablesMap(newTables)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }, [connectionId, scopeDatabase])

  useEffect(() => { loadData() }, [loadData])

  // Build the graph whenever data changes
  useEffect(() => {
    const newNodes: Node[] = []
    const newEdges: Edge[] = []

    for (const db of databases) {
      const dbId = `db:${db}`
      newNodes.push({
        id: dbId,
        type: 'database',
        position: { x: 0, y: 0 },
        data: { label: db, isDefault: db === defaultDb },
      })

      const schemas = schemasMap[db] ?? []
      for (const schema of schemas) {
        const schemaId = `schema:${db}/${schema}`
        const tables = tablesMap[`${db}/${schema}`] ?? []
        newNodes.push({
          id: schemaId,
          type: 'schema',
          position: { x: 0, y: 0 },
          data: { label: schema, tableCount: tables.length },
        })
        newEdges.push({
          id: `e:${dbId}-${schemaId}`,
          source: dbId,
          target: schemaId,
          style: EDGE_STYLE,
        })

        for (const t of tables) {
          const tableId = `table:${db}/${schema}.${t.name}`
          newNodes.push({
            id: tableId,
            type: 'table',
            position: { x: 0, y: 0 },
            data: { label: t.name, tableType: t.type, columns: [], expanded: false },
          })
          newEdges.push({
            id: `e:${schemaId}-${tableId}`,
            source: schemaId,
            target: tableId,
            style: EDGE_STYLE,
          })
        }
      }
    }

    const { nodes: layouted, edges: layoutedEdges } = getLayoutedElements(
      newNodes, newEdges,
      { direction: 'LR', ranksep: 100, nodesep: 20 }
    )
    setNodes(layouted)
    setEdges(layoutedEdges)
  }, [databases, defaultDb, schemasMap, tablesMap])

  // Double-click table node → open query tab
  const handleNodeDoubleClick = useCallback((_event: React.MouseEvent, node: Node) => {
    if (node.type === 'table' && node.id.startsWith('table:')) {
      // Parse db/schema.table from node id
      const rest = node.id.slice('table:'.length) // "db/schema.table"
      const slashIdx = rest.indexOf('/')
      const db = rest.slice(0, slashIdx)
      const dotIdx = rest.indexOf('.', slashIdx)
      const schema = rest.slice(slashIdx + 1, dotIdx)
      const tableName = rest.slice(dotIdx + 1)
      useEditorStore.getState().addTabWithContent(
        tableName,
        `SELECT *\nFROM ${schema}.${tableName}\nLIMIT 100;`,
        db
      )
    }
  }, [])

  if (!connectionId) {
    return (
      <div style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center', color: 'var(--mai-text-3)', fontSize: 13 }}>
        Connect to a database to view mindmap
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--mai-bg-base)' }}>
      {/* Toolbar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px',
        borderBottom: '1px solid var(--mai-border)',
        background: 'var(--mai-bg-panel)', flexShrink: 0, height: 38,
      }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--mai-text-2)' }}>Mindmap</span>

        <div style={{ width: 1, height: 16, background: 'var(--mai-border-strong)' }} />

        {/* Refresh */}
        <button
          onClick={loadData}
          disabled={loading}
          title="Refresh"
          style={{
            width: 28, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center',
            borderRadius: 5, border: '1px solid var(--mai-border-strong)',
            background: 'transparent', color: 'var(--mai-text-2)', cursor: 'pointer',
          }}
        >
          <RefreshCw size={11} className={loading ? 'animate-spin' : ''} />
        </button>

        {loading && <Loader2 size={12} className="animate-spin" style={{ color: 'var(--mai-text-3)' }} />}
        {error && (
          <span style={{ fontSize: 11, color: '#F87171', display: 'flex', alignItems: 'center', gap: 4 }}>
            <AlertCircle size={11} /> {error}
          </span>
        )}

        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 11, color: 'var(--mai-text-3)' }}>
          {databases.length} db{databases.length !== 1 ? 's' : ''} · {Object.values(schemasMap).flat().length} schemas · {Object.values(tablesMap).flat().length} tables
        </span>
      </div>

      {/* React Flow canvas */}
      <div style={{ flex: 1, minHeight: 0 }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeDoubleClick={handleNodeDoubleClick}
          nodeTypes={nodeTypes}
          fitView
          proOptions={{ hideAttribution: true }}
          style={{ background: '#0d0d0d' }}
        >
          <Background color="var(--mai-bg-hover)" gap={20} />
          <Controls
            showInteractive={false}
            style={{ background: 'var(--mai-bg-elevated)', border: '1px solid var(--mai-border-strong)', borderRadius: 6 }}
          />
          <MiniMap
            nodeColor={(node) => {
              if (node.type === 'database') return '#34D399'
              if (node.type === 'schema') return '#F5B800'
              return '#F97316'
            }}
            style={{ background: 'var(--mai-bg-panel)', border: '1px solid var(--mai-border-strong)', borderRadius: 6 }}
            maskColor="rgba(0,0,0,0.6)"
          />
        </ReactFlow>
      </div>
    </div>
  )
}
