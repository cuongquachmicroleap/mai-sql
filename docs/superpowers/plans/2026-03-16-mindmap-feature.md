# Database Mindmap Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a mindmap visualization that shows database hierarchy (databases > schemas > tables) at the overview level, and table relationships when drilling into a schema — accessible via activity bar and as a tab.

**Architecture:** Uses `@xyflow/react` (reactflow v12) with `dagre` for auto-layout. Two view modes: "hierarchy" shows the full database tree as a mind map, "relationships" shows FK connections between tables in a selected schema. Custom dark-themed nodes match the existing UI. Accessible both as a full-view (activity bar) and as a scoped tab (opened from sidebar context menu on database/schema nodes).

**Tech Stack:** `@xyflow/react` (React Flow v12), `dagre` (directed graph layout), React, Zustand, existing IPC schema APIs.

---

## File Structure

| File | Responsibility |
|------|---------------|
| `src/renderer/src/components/mindmap/MindmapView.tsx` | Main mindmap component — data loading, view mode toggle, toolbar |
| `src/renderer/src/components/mindmap/nodes/DatabaseNode.tsx` | Custom reactflow node for database |
| `src/renderer/src/components/mindmap/nodes/SchemaNode.tsx` | Custom reactflow node for schema |
| `src/renderer/src/components/mindmap/nodes/TableNode.tsx` | Custom reactflow node for table (expandable columns) |
| `src/renderer/src/components/mindmap/layout.ts` | Dagre layout helpers — positions nodes in tree or relationship mode |
| `src/renderer/src/components/mindmap/styles.ts` | Shared node/edge style constants |
| `src/renderer/src/components/layout/MainLayout.tsx` | **Modify:** Add mindmap to activity bar + ActiveView type |
| `src/renderer/src/stores/editor-store.ts` | **Modify:** Add `openMindmap()` action for tab-based access |
| `src/renderer/src/components/sidebar/DatabaseTree.tsx` | **Modify:** Add "Open Mindmap" to context menus on database/schema rows |

---

## Chunk 1: Dependencies + Layout Utilities + Custom Nodes

### Task 1: Install dependencies

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install @xyflow/react and dagre**

```bash
npm install @xyflow/react dagre
npm install -D @types/dagre
```

- [ ] **Step 2: Verify installation**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add @xyflow/react and dagre dependencies"
```

---

### Task 2: Create layout utility

**Files:**
- Create: `src/renderer/src/components/mindmap/layout.ts`

- [ ] **Step 1: Create the layout helper**

This module takes reactflow nodes/edges and returns nodes with positions calculated by dagre.

```typescript
import Dagre from 'dagre'
import type { Node, Edge } from '@xyflow/react'

interface LayoutOptions {
  direction?: 'TB' | 'LR'
  nodeWidth?: number
  nodeHeight?: number
  ranksep?: number
  nodesep?: number
}

export function getLayoutedElements(
  nodes: Node[],
  edges: Edge[],
  options: LayoutOptions = {}
): { nodes: Node[]; edges: Edge[] } {
  const {
    direction = 'LR',
    nodeWidth = 200,
    nodeHeight = 60,
    ranksep = 80,
    nodesep = 40,
  } = options

  const g = new Dagre.graphlib.Graph().setDefaultEdgeLabel(() => ({}))
  g.setGraph({ rankdir: direction, ranksep, nodesep })

  for (const node of nodes) {
    const w = (node.measured?.width ?? node.width ?? nodeWidth) as number
    const h = (node.measured?.height ?? node.height ?? nodeHeight) as number
    g.setNode(node.id, { width: w, height: h })
  }

  for (const edge of edges) {
    g.setEdge(edge.source, edge.target)
  }

  Dagre.layout(g)

  const layoutedNodes = nodes.map((node) => {
    const pos = g.node(node.id)
    const w = (node.measured?.width ?? node.width ?? nodeWidth) as number
    const h = (node.measured?.height ?? node.height ?? nodeHeight) as number
    return {
      ...node,
      position: { x: pos.x - w / 2, y: pos.y - h / 2 },
    }
  })

  return { nodes: layoutedNodes, edges }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/renderer/src/components/mindmap/layout.ts
git commit -m "feat(mindmap): add dagre layout utility"
```

---

### Task 3: Create shared style constants

**Files:**
- Create: `src/renderer/src/components/mindmap/styles.ts`

- [ ] **Step 1: Create styles module**

```typescript
import type { CSSProperties } from 'react'

export const NODE_COLORS = {
  database: '#34D399',
  schema: '#5B8AF0',
  table: '#F97316',
  view: '#A78BFA',
  column: '#8B8B8B',
  pk: '#FBBF24',
  fk: '#F97316',
} as const

export const baseNodeStyle: CSSProperties = {
  background: '#1C1C20',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 8,
  color: '#ECECEC',
  fontSize: 12,
  fontFamily: 'inherit',
}

export const EDGE_STYLE = {
  stroke: 'rgba(255,255,255,0.15)',
  strokeWidth: 1.5,
} as const

export const EDGE_STYLE_FK = {
  stroke: '#F97316',
  strokeWidth: 1.5,
  strokeDasharray: '6 3',
} as const
```

- [ ] **Step 2: Commit**

```bash
git add src/renderer/src/components/mindmap/styles.ts
git commit -m "feat(mindmap): add shared style constants"
```

---

### Task 4: Create DatabaseNode

**Files:**
- Create: `src/renderer/src/components/mindmap/nodes/DatabaseNode.tsx`

- [ ] **Step 1: Create the component**

```tsx
import { memo } from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import { Server } from 'lucide-react'
import { NODE_COLORS, baseNodeStyle } from '../styles'

export type DatabaseNodeData = {
  label: string
  isDefault: boolean
}

export const DatabaseNode = memo(function DatabaseNode({ data }: NodeProps) {
  const { label, isDefault } = data as DatabaseNodeData
  return (
    <div style={{
      ...baseNodeStyle,
      padding: '10px 14px',
      minWidth: 160,
      borderColor: isDefault ? NODE_COLORS.database : 'rgba(255,255,255,0.1)',
    }}>
      <Handle type="source" position={Position.Right} style={{ background: NODE_COLORS.database }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Server size={14} style={{ color: NODE_COLORS.database, flexShrink: 0 }} />
        <span style={{ fontWeight: 600, fontSize: 13 }}>{label}</span>
        {isDefault && (
          <span style={{ fontSize: 9, color: '#555560', marginLeft: 'auto' }}>connected</span>
        )}
      </div>
    </div>
  )
})
```

- [ ] **Step 2: Commit**

```bash
git add src/renderer/src/components/mindmap/nodes/DatabaseNode.tsx
git commit -m "feat(mindmap): add DatabaseNode component"
```

---

### Task 5: Create SchemaNode

**Files:**
- Create: `src/renderer/src/components/mindmap/nodes/SchemaNode.tsx`

- [ ] **Step 1: Create the component**

```tsx
import { memo } from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import { Database } from 'lucide-react'
import { NODE_COLORS, baseNodeStyle } from '../styles'

export type SchemaNodeData = {
  label: string
  tableCount?: number
}

export const SchemaNode = memo(function SchemaNode({ data }: NodeProps) {
  const { label, tableCount } = data as SchemaNodeData
  return (
    <div style={{
      ...baseNodeStyle,
      padding: '8px 12px',
      minWidth: 140,
    }}>
      <Handle type="target" position={Position.Left} style={{ background: NODE_COLORS.schema }} />
      <Handle type="source" position={Position.Right} style={{ background: NODE_COLORS.schema }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <Database size={12} style={{ color: NODE_COLORS.schema, flexShrink: 0 }} />
        <span style={{ fontWeight: 500 }}>{label}</span>
        {tableCount !== undefined && (
          <span style={{ fontSize: 10, color: '#555560', marginLeft: 'auto' }}>
            {tableCount} table{tableCount !== 1 ? 's' : ''}
          </span>
        )}
      </div>
    </div>
  )
})
```

- [ ] **Step 2: Commit**

```bash
git add src/renderer/src/components/mindmap/nodes/SchemaNode.tsx
git commit -m "feat(mindmap): add SchemaNode component"
```

---

### Task 6: Create TableNode (expandable with columns)

**Files:**
- Create: `src/renderer/src/components/mindmap/nodes/TableNode.tsx`

- [ ] **Step 1: Create the component**

The table node shows the table name by default and expands to show columns when clicked. In relationship mode, columns are always visible.

```tsx
import { memo, useState } from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import { Table2, Key, ChevronDown, ChevronRight } from 'lucide-react'
import { NODE_COLORS, baseNodeStyle } from '../styles'
import type { ColumnInfo } from '@shared/types/schema'

export type TableNodeData = {
  label: string
  tableType: 'table' | 'view'
  columns?: ColumnInfo[]
  expanded?: boolean
}

export const TableNode = memo(function TableNode({ data }: NodeProps) {
  const { label, tableType, columns = [], expanded: forceExpanded } = data as TableNodeData
  const [expanded, setExpanded] = useState(forceExpanded ?? false)
  const showColumns = expanded || forceExpanded
  const iconColor = tableType === 'view' ? NODE_COLORS.view : NODE_COLORS.table

  return (
    <div style={{
      ...baseNodeStyle,
      minWidth: 180,
      overflow: 'hidden',
    }}>
      <Handle type="target" position={Position.Left} style={{ background: iconColor }} />
      <Handle type="source" position={Position.Right} style={{ background: iconColor }} />

      {/* Header */}
      <button
        onClick={() => setExpanded((v) => !v)}
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          width: '100%', padding: '8px 10px',
          background: 'transparent', border: 'none', color: '#ECECEC',
          cursor: 'pointer', fontSize: 12,
        }}
      >
        {columns.length > 0 && (
          showColumns
            ? <ChevronDown size={10} style={{ color: '#555560', flexShrink: 0 }} />
            : <ChevronRight size={10} style={{ color: '#555560', flexShrink: 0 }} />
        )}
        <Table2 size={11} style={{ color: iconColor, flexShrink: 0 }} />
        <span style={{ fontWeight: 500 }}>{label}</span>
        {columns.length > 0 && !showColumns && (
          <span style={{ fontSize: 10, color: '#555560', marginLeft: 'auto' }}>
            {columns.length} col{columns.length !== 1 ? 's' : ''}
          </span>
        )}
      </button>

      {/* Columns */}
      {showColumns && columns.length > 0 && (
        <div style={{
          borderTop: '1px solid rgba(255,255,255,0.06)',
          padding: '4px 0',
          maxHeight: 200,
          overflowY: 'auto',
        }}>
          {columns.map((col) => (
            <div key={col.name} style={{
              display: 'flex', alignItems: 'center', gap: 4,
              padding: '2px 10px', fontSize: 11,
            }}>
              {col.isPrimaryKey
                ? <Key size={9} style={{ color: NODE_COLORS.pk, flexShrink: 0 }} />
                : col.isForeignKey
                ? <span style={{ fontSize: 9, color: NODE_COLORS.fk, flexShrink: 0 }}>&#8594;</span>
                : <span style={{ width: 9, flexShrink: 0 }} />}
              <span style={{
                color: col.isPrimaryKey ? NODE_COLORS.pk : col.isForeignKey ? NODE_COLORS.fk : '#ECECEC',
                fontWeight: col.isPrimaryKey ? 600 : 400,
              }}>
                {col.name}
              </span>
              <span style={{ marginLeft: 'auto', fontSize: 10, color: '#555560', fontFamily: 'monospace' }}>
                {col.displayType}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
})
```

- [ ] **Step 2: Commit**

```bash
git add src/renderer/src/components/mindmap/nodes/TableNode.tsx
git commit -m "feat(mindmap): add expandable TableNode component"
```

---

## Chunk 2: Main MindmapView Component

### Task 7: Create MindmapView

**Files:**
- Create: `src/renderer/src/components/mindmap/MindmapView.tsx`

- [ ] **Step 1: Create the main mindmap component**

This is the largest piece. It handles:
- Loading databases/schemas/tables/relationships via IPC
- Building reactflow nodes and edges for two modes: hierarchy and relationships
- Toolbar with view mode toggle, database/schema selectors, refresh, fit-to-view
- Auto-layout via dagre

Props: optional `scopeDatabase` and `scopeSchema` for tab-based scoped view.

```tsx
import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  useReactFlow,
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
        setSchemas(s.length ? s : ['public'])
        if (!selectedSchema && viewMode === 'relationships') {
          setSelectedSchema(scopeSchema ?? s[0] ?? 'public')
        }
      })
      .catch(() => setSchemas([]))
      .finally(() => setLoading(false))
  }, [connectionId, selectedDb])

  // Load tables for all schemas (hierarchy) or selected schema (relationships)
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

      // Schema nodes + edges
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
        direction: viewMode === 'hierarchy' ? 'LR' : 'LR',
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
```

- [ ] **Step 2: Verify build**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add src/renderer/src/components/mindmap/MindmapView.tsx
git commit -m "feat(mindmap): add MindmapView with hierarchy and relationship modes"
```

---

## Chunk 3: Integration — Activity Bar + Tab + Sidebar

### Task 8: Add mindmap to activity bar and view system

**Files:**
- Modify: `src/renderer/src/components/layout/MainLayout.tsx`

- [ ] **Step 1: Update MainLayout**

Changes:
1. Import `MindmapView` and `GitBranch` icon
2. Add `'mindmap'` to `ActiveView` type
3. Add activity bar button for mindmap
4. Render `MindmapView` when `activeView === 'mindmap'`

In the imports, add:
```typescript
import { MindmapView } from '../mindmap/MindmapView'
```

Update the `ActiveView` type:
```typescript
type ActiveView = 'editor' | 'er-diagram' | 'backup' | 'mindmap'
```

Add the icon import — change:
```typescript
import { Database, Settings, ChevronRight, Network, ArchiveRestore } from 'lucide-react'
```
to:
```typescript
import { Database, Settings, ChevronRight, Network, ArchiveRestore, GitBranch } from 'lucide-react'
```

Add activity bar button after the ER Diagram button:
```tsx
<ActivityBtn
  icon={<GitBranch size={17} />}
  active={activeView === 'mindmap'}
  onClick={() => setActiveView((v) => v === 'mindmap' ? 'editor' : 'mindmap')}
  title="Mindmap"
/>
```

In the main area rendering, add before the editor fallthrough:
```tsx
) : activeView === 'mindmap' ? (
  <MindmapView />
```

- [ ] **Step 2: Verify build**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add src/renderer/src/components/layout/MainLayout.tsx
git commit -m "feat(mindmap): add mindmap to activity bar"
```

---

### Task 9: Add tab-based mindmap support

**Files:**
- Modify: `src/renderer/src/stores/editor-store.ts`
- Modify: `src/renderer/src/components/layout/MainLayout.tsx`

- [ ] **Step 1: Add 'mindmap' tab type to editor store**

Update `Tab` interface — add `'mindmap'` to the type union:
```typescript
type: 'query' | 'table-designer' | 'mindmap'
```

Add `mindmapDatabase` and `mindmapSchema` optional fields to `Tab`:
```typescript
mindmapDatabase?: string
mindmapSchema?: string
```

Add `openMindmap` action to `EditorState`:
```typescript
openMindmap: (database?: string, schema?: string) => void
```

Implement in the store:
```typescript
openMindmap: (database?: string, schema?: string) => {
  const id = nanoid()
  const title = schema ? `Mindmap: ${database}/${schema}` : database ? `Mindmap: ${database}` : 'Mindmap'
  const tab: Tab = {
    ...createTab(),
    id,
    type: 'mindmap',
    title,
    mindmapDatabase: database,
    mindmapSchema: schema,
  }
  set((state) => ({ tabs: [...state.tabs, tab], activeTabId: id }))
},
```

- [ ] **Step 2: Render mindmap tab in MainLayout**

In the tab type rendering logic, add a check for `'mindmap'` before `'table-designer'`:

```tsx
activeTab.type === 'mindmap' ? (
  <MindmapView
    scopeDatabase={activeTab.mindmapDatabase}
    scopeSchema={activeTab.mindmapSchema}
  />
) : activeTab.type === 'table-designer' ? (
```

- [ ] **Step 3: Verify build**

```bash
npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add src/renderer/src/stores/editor-store.ts src/renderer/src/components/layout/MainLayout.tsx
git commit -m "feat(mindmap): support mindmap as a tab type"
```

---

### Task 10: Add "Open Mindmap" to sidebar context menus

**Files:**
- Modify: `src/renderer/src/components/sidebar/DatabaseTree.tsx`

- [ ] **Step 1: Add context menu on database nodes**

Add a new context menu for database rows. When right-clicking a database node in the sidebar, show "Open Mindmap" option. This requires:

1. Add a new state for database context menu:
```typescript
interface DbContextMenuState {
  x: number
  y: number
  database: string
}
```

2. Add state: `const [dbContextMenu, setDbContextMenu] = useState<DbContextMenuState | null>(null)`

3. Add `onContextMenu` handler to the database row button:
```tsx
onContextMenu={(e) => {
  e.preventDefault(); e.stopPropagation()
  setDbContextMenu({ x: e.clientX, y: e.clientY, database })
}}
```

4. Render a simple context menu near the database rows with one item:
```tsx
{dbContextMenu && (
  <div ref={...} style={{ position: 'fixed', left: dbContextMenu.x, top: dbContextMenu.y, zIndex: 1000, background: '#222227', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 7, padding: 4, boxShadow: '0 8px 32px rgba(0,0,0,0.5)', minWidth: 160 }}>
    <button onClick={() => {
      useEditorStore.getState().openMindmap(dbContextMenu.database)
      setDbContextMenu(null)
    }} style={{ ... }}>
      Open Mindmap
    </button>
  </div>
)}
```

5. Similarly, add "Open Mindmap" as an option in the existing table context menu — the schema-level option. Add `'mindmap'` to the action union and handle it:
```typescript
case 'mindmap': useEditorStore.getState().openMindmap(database, schema); break
```

- [ ] **Step 2: Verify build**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add src/renderer/src/components/sidebar/DatabaseTree.tsx
git commit -m "feat(mindmap): add Open Mindmap to sidebar context menus"
```

---

### Task 11: Final verification

- [ ] **Step 1: Full type check**

```bash
npx tsc --noEmit
```

- [ ] **Step 2: Run existing tests**

```bash
npm test
```

- [ ] **Step 3: Manual verification checklist**

1. Activity bar shows mindmap icon (GitBranch)
2. Click mindmap icon → full mindmap view with hierarchy mode
3. Toggle to relationship mode → tables with FK edges shown
4. Database/schema selectors work in toolbar
5. Double-click a table node → opens new query tab
6. Right-click database in sidebar → "Open Mindmap" → opens scoped mindmap tab
7. Right-click table in sidebar → "Open Mindmap" → opens mindmap tab scoped to that database/schema
8. Pan, zoom, minimap all functional
9. Dark theme matches rest of app
