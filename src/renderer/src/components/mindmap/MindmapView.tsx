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
import { Loader2, AlertCircle, RefreshCw, GitBranch, Network } from 'lucide-react'
import { invoke } from '../../lib/ipc-client'
import { useConnectionStore } from '../../stores/connection-store'
import { useEditorStore } from '../../stores/editor-store'
import { getLayoutedElements } from './layout'
import { EDGE_STYLE, EDGE_STYLE_FK } from './styles'
import { DatabaseNode } from './nodes/DatabaseNode'
import { SchemaNode } from './nodes/SchemaNode'
import { TableNode } from './nodes/TableNode'
import type { TableInfo, ColumnInfo, Relationship } from '@shared/types/schema'

const nodeTypes: NodeTypes = {
  database: DatabaseNode,
  schema: SchemaNode,
  table: TableNode,
}

type ViewMode = 'hierarchy' | 'relationships'

interface MindmapViewProps {
  scopeDatabase?: string
  scopeSchema?: string
}

export function MindmapView({ scopeDatabase, scopeSchema }: MindmapViewProps) {
  const { activeConnectionId } = useConnectionStore()
  const connectionId = activeConnectionId

  const [viewMode, setViewMode] = useState<ViewMode>(scopeSchema ? 'relationships' : 'hierarchy')
  const [databases, setDatabases] = useState<string[]>([])
  const [defaultDb, setDefaultDb] = useState('postgres')
  const [selectedDb, setSelectedDb] = useState<string>(scopeDatabase ?? '')
  const [selectedSchema, setSelectedSchema] = useState<string>(scopeSchema ?? '')
  const [schemas, setSchemas] = useState<string[]>([])
  const [tables, setTables] = useState<Record<string, TableInfo[]>>({})
  const [columns, setColumns] = useState<Record<string, ColumnInfo[]>>({})
  const [relationships, setRelationships] = useState<Record<string, Relationship[]>>({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [nodes, setNodes, onNodesChange] = useNodesState([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])

  // Load databases on mount
  useEffect(() => {
    if (!connectionId) return
    setLoading(true)
    setError(null)
    Promise.all([
      invoke('schema:databases', connectionId),
      invoke('schema:default-database', connectionId),
    ]).then(([dbs, defDb]) => {
      setDatabases(dbs)
      setDefaultDb(defDb)
      if (!selectedDb) setSelectedDb(scopeDatabase ?? defDb)
    }).catch((err) => setError((err as Error).message))
      .finally(() => setLoading(false))
  }, [connectionId])

  // Load schemas when database changes
  useEffect(() => {
    if (!connectionId || !selectedDb) return
    setLoading(true)
    invoke('schema:schemas', connectionId, selectedDb)
      .then((s) => {
        const list = s.length ? s : ['public']
        setSchemas(list)
        if (!selectedSchema && viewMode === 'relationships') {
          setSelectedSchema(scopeSchema ?? list[0] ?? 'public')
        }
      })
      .catch(() => setSchemas([]))
      .finally(() => setLoading(false))
  }, [connectionId, selectedDb])

  // Load tables for schemas
  useEffect(() => {
    if (!connectionId || !selectedDb || schemas.length === 0) return
    setLoading(true)
    const schemasToLoad = viewMode === 'relationships' && selectedSchema
      ? [selectedSchema]
      : schemas

    Promise.all(
      schemasToLoad.map(async (schema) => {
        const tbls = await invoke('schema:tables', connectionId, schema, selectedDb)
        return { schema, tables: tbls }
      })
    ).then((results) => {
      const newTables: Record<string, TableInfo[]> = {}
      for (const r of results) newTables[r.schema] = r.tables
      setTables(newTables)
    }).catch(() => {})
      .finally(() => setLoading(false))
  }, [connectionId, selectedDb, schemas, viewMode, selectedSchema])

  // Load columns + relationships for relationship mode
  useEffect(() => {
    if (viewMode !== 'relationships' || !connectionId || !selectedDb || !selectedSchema) return
    const schemaTables = tables[selectedSchema]
    if (!schemaTables?.length) return

    setLoading(true)
    Promise.all([
      ...schemaTables.map(async (t) => {
        const cols = await invoke('schema:columns', connectionId, t.name, selectedSchema, selectedDb)
        return { table: t.name, cols }
      }),
      invoke('schema:relationships', connectionId, selectedSchema, selectedDb),
    ]).then((results) => {
      const rels = results[results.length - 1] as Relationship[]
      setRelationships((prev) => ({ ...prev, [selectedSchema]: rels }))
      const newCols: Record<string, ColumnInfo[]> = {}
      for (let i = 0; i < results.length - 1; i++) {
        const r = results[i] as { table: string; cols: ColumnInfo[] }
        newCols[`${selectedSchema}.${r.table}`] = r.cols
      }
      setColumns((prev) => ({ ...prev, ...newCols }))
    }).catch(() => {})
      .finally(() => setLoading(false))
  }, [connectionId, selectedDb, selectedSchema, tables, viewMode])

  // Build nodes and edges
  const buildGraph = useCallback(() => {
    const newNodes: Node[] = []
    const newEdges: Edge[] = []

    if (viewMode === 'hierarchy') {
      // Database nodes
      const dbsToShow = scopeDatabase ? [scopeDatabase] : databases
      for (const db of dbsToShow) {
        newNodes.push({
          id: `db:${db}`,
          type: 'database',
          position: { x: 0, y: 0 },
          data: { label: db, isDefault: db === defaultDb },
        })
      }

      // Schema nodes + edges from selected db
      const dbSchemas = selectedDb && schemas.length ? schemas : []
      for (const schema of dbSchemas) {
        const schemaId = `schema:${selectedDb}/${schema}`
        const schemaTables = tables[schema] ?? []
        newNodes.push({
          id: schemaId,
          type: 'schema',
          position: { x: 0, y: 0 },
          data: { label: schema, tableCount: schemaTables.length },
        })
        newEdges.push({
          id: `e:db-schema:${selectedDb}-${schema}`,
          source: `db:${selectedDb}`,
          target: schemaId,
          style: EDGE_STYLE,
        })

        // Table nodes
        for (const t of schemaTables) {
          const tableId = `table:${selectedDb}/${schema}.${t.name}`
          newNodes.push({
            id: tableId,
            type: 'table',
            position: { x: 0, y: 0 },
            data: { label: t.name, tableType: t.type, columns: [], expanded: false },
          })
          newEdges.push({
            id: `e:schema-table:${schema}-${t.name}`,
            source: schemaId,
            target: tableId,
            style: EDGE_STYLE,
          })
        }
      }
    } else {
      // Relationship mode — tables with FK edges
      const schemaTables = tables[selectedSchema] ?? []
      for (const t of schemaTables) {
        const tableId = `table:${t.name}`
        const tableCols = columns[`${selectedSchema}.${t.name}`] ?? []
        newNodes.push({
          id: tableId,
          type: 'table',
          position: { x: 0, y: 0 },
          data: { label: t.name, tableType: t.type, columns: tableCols, expanded: true },
        })
      }

      const rels = relationships[selectedSchema] ?? []
      for (const rel of rels) {
        newEdges.push({
          id: `fk:${rel.constraintName}`,
          source: `table:${rel.sourceTable}`,
          target: `table:${rel.targetTable}`,
          label: rel.constraintName,
          style: EDGE_STYLE_FK,
          animated: true,
          labelStyle: { fontSize: 9, fill: '#555560' },
          labelBgStyle: { fill: '#131316', fillOpacity: 0.9 },
        })
      }
    }

    const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
      newNodes,
      newEdges,
      {
        direction: 'LR',
        ranksep: viewMode === 'hierarchy' ? 100 : 120,
        nodesep: viewMode === 'hierarchy' ? 30 : 50,
      }
    )

    setNodes(layoutedNodes)
    setEdges(layoutedEdges)
  }, [viewMode, databases, defaultDb, selectedDb, schemas, tables, columns, relationships, selectedSchema, scopeDatabase])

  useEffect(() => { buildGraph() }, [buildGraph])

  // Double-click table node → open query tab
  const handleNodeDoubleClick = useCallback((_event: React.MouseEvent, node: Node) => {
    if (node.type === 'table') {
      const tableName = (node.data as { label: string }).label
      const schema = selectedSchema || 'public'
      const db = selectedDb || defaultDb
      useEditorStore.getState().addTabWithContent(
        tableName,
        `SELECT *\nFROM ${schema}.${tableName}\nLIMIT 100;`,
        db
      )
    }
  }, [selectedSchema, selectedDb, defaultDb])

  if (!connectionId) {
    return (
      <div style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center', color: '#555560', fontSize: 13 }}>
        Connect to a database to view mindmap
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#131316' }}>
      {/* Toolbar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
        background: '#1C1C20', flexShrink: 0, height: 38,
      }}>
        {/* View mode toggle */}
        <div style={{ display: 'flex', borderRadius: 5, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)' }}>
          <button
            onClick={() => setViewMode('hierarchy')}
            style={{
              padding: '0 10px', height: 26, fontSize: 11, fontWeight: 500, border: 'none', cursor: 'pointer',
              background: viewMode === 'hierarchy' ? '#5B8AF0' : 'transparent',
              color: viewMode === 'hierarchy' ? '#fff' : '#8B8B8B',
              display: 'flex', alignItems: 'center', gap: 4,
            }}
          >
            <Network size={10} /> Hierarchy
          </button>
          <button
            onClick={() => setViewMode('relationships')}
            style={{
              padding: '0 10px', height: 26, fontSize: 11, fontWeight: 500, border: 'none', cursor: 'pointer',
              background: viewMode === 'relationships' ? '#5B8AF0' : 'transparent',
              color: viewMode === 'relationships' ? '#fff' : '#8B8B8B',
              display: 'flex', alignItems: 'center', gap: 4,
            }}
          >
            <GitBranch size={10} /> Relationships
          </button>
        </div>

        <div style={{ width: 1, height: 16, background: 'rgba(255,255,255,0.08)' }} />

        {/* Database selector */}
        {!scopeDatabase && (
          <select
            value={selectedDb}
            onChange={(e) => { setSelectedDb(e.target.value); setSelectedSchema('') }}
            style={{
              height: 26, padding: '0 6px', borderRadius: 5, fontSize: 11,
              border: '1px solid rgba(255,255,255,0.1)', background: '#222227',
              color: '#ECECEC', cursor: 'pointer', outline: 'none',
            }}
          >
            {databases.map((db) => <option key={db} value={db}>{db}</option>)}
          </select>
        )}

        {/* Schema selector (relationship mode) */}
        {viewMode === 'relationships' && (
          <select
            value={selectedSchema}
            onChange={(e) => setSelectedSchema(e.target.value)}
            style={{
              height: 26, padding: '0 6px', borderRadius: 5, fontSize: 11,
              border: '1px solid rgba(255,255,255,0.1)', background: '#222227',
              color: '#ECECEC', cursor: 'pointer', outline: 'none',
            }}
          >
            {schemas.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        )}

        {/* Refresh */}
        <button
          onClick={buildGraph}
          disabled={loading}
          title="Refresh"
          style={{
            width: 28, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center',
            borderRadius: 5, border: '1px solid rgba(255,255,255,0.1)',
            background: 'transparent', color: '#8B8B8B', cursor: 'pointer',
          }}
        >
          <RefreshCw size={11} className={loading ? 'animate-spin' : ''} />
        </button>

        {loading && <Loader2 size={12} className="animate-spin" style={{ color: '#555560' }} />}
        {error && (
          <span style={{ fontSize: 11, color: '#F87171', display: 'flex', alignItems: 'center', gap: 4 }}>
            <AlertCircle size={11} /> {error}
          </span>
        )}
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
          <Background color="rgba(255,255,255,0.03)" gap={20} />
          <Controls
            showInteractive={false}
            style={{ background: '#222227', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6 }}
          />
          <MiniMap
            nodeColor={(node) => {
              if (node.type === 'database') return '#34D399'
              if (node.type === 'schema') return '#5B8AF0'
              return '#F97316'
            }}
            style={{ background: '#1C1C20', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6 }}
            maskColor="rgba(0,0,0,0.6)"
          />
        </ReactFlow>
      </div>
    </div>
  )
}
