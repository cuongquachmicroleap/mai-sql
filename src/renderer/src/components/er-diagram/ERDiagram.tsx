import { useState, useEffect, useRef, useCallback } from 'react'
import { RefreshCw, Network, AlertCircle, ZoomIn, ZoomOut, Maximize2, GripVertical } from 'lucide-react'
import { invoke } from '../../lib/ipc-client'
import { useConnectionStore } from '../../stores/connection-store'
import type { TableInfo, ColumnInfo, Relationship } from '@shared/types/schema'

// ─── Layout constants ────────────────────────────────────────────────────────
const NODE_WIDTH = 260
const NODE_HEADER_HEIGHT = 30
const NODE_ROW_HEIGHT = 24
const NODE_PADDING_BOTTOM = 8
const ICON_STRIP_WIDTH = 22
const COLS = 4
const H_GAP = 80
const V_GAP = 100

// ─── IndexedDB helpers ───────────────────────────────────────────────────────
const DB_NAME = 'mai-sql-er'
const DB_VERSION = 1
const STORE_NAME = 'node-positions'

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => req.result.createObjectStore(STORE_NAME)
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

async function loadPositions(key: string): Promise<Record<string, { x: number; y: number }> | null> {
  try {
    const db = await openDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly')
      const req = tx.objectStore(STORE_NAME).get(key)
      req.onsuccess = () => resolve(req.result ?? null)
      req.onerror = () => reject(req.error)
    })
  } catch {
    return null
  }
}

async function savePositions(key: string, positions: Record<string, { x: number; y: number }>) {
  try {
    const db = await openDB()
    return new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite')
      tx.objectStore(STORE_NAME).put(positions, key)
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  } catch {
    // silently ignore persistence errors
  }
}

// ─── Types ───────────────────────────────────────────────────────────────────
interface TableNode {
  id: string
  table: TableInfo
  columns: ColumnInfo[]
  x: number
  y: number
  width: number
  height: number
}

interface Edge {
  id: string
  rel: Relationship
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function nodeHeight(columns: ColumnInfo[]): number {
  return NODE_HEADER_HEIGHT + columns.length * NODE_ROW_HEIGHT + NODE_PADDING_BOTTOM
}

function layoutNodes(
  tables: TableInfo[],
  columnsByTable: Record<string, ColumnInfo[]>
): TableNode[] {
  return tables.map((table, i) => {
    const cols = columnsByTable[table.name] ?? []
    const col = i % COLS
    const row = Math.floor(i / COLS)
    return {
      id: table.name,
      table,
      columns: cols,
      x: col * (NODE_WIDTH + H_GAP),
      y: row * (Math.max(nodeHeight(cols), 120) + V_GAP),
      width: NODE_WIDTH,
      height: nodeHeight(cols),
    }
  })
}

/** Returns the centre-point of a node's right or left edge for edge routing */
function edgeAnchor(
  node: TableNode,
  side: 'left' | 'right',
  rowIndex: number
): { x: number; y: number } {
  const y = node.y + NODE_HEADER_HEIGHT + rowIndex * NODE_ROW_HEIGHT + NODE_ROW_HEIGHT / 2
  const x = side === 'left' ? node.x : node.x + node.width
  return { x, y }
}

// ─── SVG edge path ────────────────────────────────────────────────────────────
function buildPath(sx: number, sy: number, tx: number, ty: number): string {
  const dx = Math.abs(tx - sx)
  const cx = Math.max(40, dx * 0.5)
  const csx = sx < tx ? sx + cx : sx - cx
  const ctx = sx < tx ? tx - cx : tx + cx
  return `M ${sx} ${sy} C ${csx} ${sy}, ${ctx} ${ty}, ${tx} ${ty}`
}

// ─── Key icon sub-components ─────────────────────────────────────────────────
function KeyIconPK() {
  return (
    <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
      <circle cx="5" cy="5.5" r="3" stroke="#FACC15" strokeWidth="1.4"/>
      <line x1="7.5" y1="5.5" x2="13" y2="5.5" stroke="#FACC15" strokeWidth="1.4"/>
      <line x1="11"  y1="5.5" x2="11" y2="7.5" stroke="#FACC15" strokeWidth="1.4"/>
      <line x1="9"   y1="5.5" x2="9"  y2="7"   stroke="#FACC15" strokeWidth="1.4"/>
    </svg>
  )
}

function KeyIconFK() {
  return (
    <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
      <circle cx="5" cy="5.5" r="3" stroke="#7B9FD4" strokeWidth="1.2"/>
      <line x1="7.5" y1="5.5" x2="13" y2="5.5" stroke="#7B9FD4" strokeWidth="1.2"/>
      <line x1="11"  y1="5.5" x2="11" y2="7.5" stroke="#7B9FD4" strokeWidth="1.2"/>
      <line x1="9"   y1="5.5" x2="9"  y2="7"   stroke="#7B9FD4" strokeWidth="1.2"/>
    </svg>
  )
}

// ─── TableNodeCard ────────────────────────────────────────────────────────────
interface TableNodeCardProps {
  node: TableNode
  onDragStart: (e: React.MouseEvent, nodeId: string) => void
}

function TableNodeCard({ node, onDragStart }: TableNodeCardProps) {
  return (
    <foreignObject x={node.x} y={node.y} width={node.width} height={node.height} overflow="visible">
      <div
        style={{
          width: node.width,
          border: '1px solid rgba(255,255,255,0.10)',
          borderRadius: 4,
          overflow: 'hidden',
          background: '#1C1C20',
          boxShadow: '0 1px 4px rgba(0,0,0,0.6)',
          fontFamily: 'var(--font-sans, system-ui, sans-serif)',
        }}
      >
        {/* Header — drag handle */}
        <div
          onMouseDown={(e) => onDragStart(e, node.id)}
          style={{
            height: NODE_HEADER_HEIGHT,
            background: '#252B3B',
            borderBottom: '1px solid rgba(255,255,255,0.08)',
            display: 'flex',
            alignItems: 'center',
            paddingLeft: 6,
            paddingRight: 10,
            cursor: 'move',
            userSelect: 'none',
          }}
        >
          <GripVertical size={10} style={{ color: 'rgba(200,216,240,0.35)', marginRight: 4, flexShrink: 0 }} />
          <span
            style={{
              color: '#C8D8F0',
              fontWeight: 700,
              fontSize: 12,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              flex: 1,
            }}
          >
            {node.table.name}
          </span>
          {node.table.type !== 'table' && (
            <span
              style={{
                fontSize: 9,
                color: '#60a5fa',
                marginLeft: 4,
                textTransform: 'uppercase',
                letterSpacing: 1,
              }}
            >
              {node.table.type}
            </span>
          )}
        </div>

        {/* Columns */}
        {node.columns.map((col) => (
          <div
            key={col.name}
            style={{
              height: NODE_ROW_HEIGHT,
              display: 'flex',
              alignItems: 'center',
              borderBottom: '1px solid rgba(255,255,255,0.04)',
              background: col.isPrimaryKey ? 'rgba(250,204,21,0.04)' : undefined,
            }}
          >
            {/* Left icon strip */}
            <div
              style={{
                width: ICON_STRIP_WIDTH,
                minWidth: ICON_STRIP_WIDTH,
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRight: '1px solid rgba(255,255,255,0.06)',
                background: 'rgba(0,0,0,0.15)',
              }}
            >
              {col.isPrimaryKey && <KeyIconPK />}
              {col.isForeignKey && !col.isPrimaryKey && <KeyIconFK />}
            </div>
            {/* Content area */}
            <div
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                paddingLeft: 6,
                paddingRight: 8,
                gap: 4,
                overflow: 'hidden',
              }}
            >
              <span
                style={{
                  fontSize: 11,
                  color: col.isPrimaryKey ? '#FDE68A' : col.isForeignKey ? '#C8D8F0' : '#ECECEC',
                  textDecoration: col.isPrimaryKey ? 'underline' : undefined,
                  flex: 1,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {col.name}
              </span>
              <span
                style={{
                  fontSize: 10,
                  color: '#555560',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                }}
              >
                {col.displayType}
              </span>
            </div>
          </div>
        ))}
      </div>
    </foreignObject>
  )
}

// ─── EdgeLine ─────────────────────────────────────────────────────────────────
interface EdgeLineProps {
  edge: Edge
  nodeMap: Map<string, TableNode>
}

function EdgeLine({ edge, nodeMap }: EdgeLineProps) {
  const { rel } = edge
  const sourceNode = nodeMap.get(rel.sourceTable)
  const targetNode = nodeMap.get(rel.targetTable)
  if (!sourceNode || !targetNode) return null

  const srcColIdx = sourceNode.columns.findIndex((c) => c.name === rel.sourceColumn)
  const tgtColIdx = targetNode.columns.findIndex((c) => c.name === rel.targetColumn)

  const srcAnchorSide = sourceNode.x < targetNode.x ? 'right' : 'left'
  const tgtAnchorSide = srcAnchorSide === 'right' ? 'left' : 'right'

  const src = edgeAnchor(sourceNode, srcAnchorSide, srcColIdx >= 0 ? srcColIdx : 0)
  const tgt = edgeAnchor(targetNode, tgtAnchorSide, tgtColIdx >= 0 ? tgtColIdx : 0)
  const d = buildPath(src.x, src.y, tgt.x, tgt.y)

  // Midpoint of cubic bezier at t=0.5
  const dx = Math.abs(tgt.x - src.x)
  const cx = Math.max(40, dx * 0.5)
  const csx = src.x < tgt.x ? src.x + cx : src.x - cx
  const ctx = src.x < tgt.x ? tgt.x - cx : tgt.x + cx
  const midX = 0.125 * src.x + 0.375 * csx + 0.375 * ctx + 0.125 * tgt.x
  const midY = 0.125 * src.y + 0.375 * src.y + 0.375 * tgt.y + 0.125 * tgt.y

  return (
    <g>
      <path d={d} fill="none" stroke="transparent" strokeWidth={8} />
      <path
        d={d}
        fill="none"
        stroke="#7B9FD4"
        strokeWidth={1.2}
        strokeOpacity={0.65}
        markerStart="url(#crow-foot-many)"
        markerEnd="url(#one-end)"
      />
      <rect x={midX - 13} y={midY - 8} width={26} height={14} rx={3} fill="#1C1C20" stroke="rgba(123,159,212,0.35)" strokeWidth={1} />
      <text x={midX} y={midY + 4} textAnchor="middle" fontSize={9} fontFamily="var(--font-sans, system-ui, sans-serif)" fill="#7B9FD4">
        N:1
      </text>
    </g>
  )
}

// ─── Main component ──────────────────────────────────────────────────────────
export function ERDiagram() {
  const { activeConnectionId } = useConnectionStore()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [nodes, setNodes] = useState<TableNode[]>([])
  const [edges, setEdges] = useState<Edge[]>([])

  // Schema/database selection state
  const [databases, setDatabases] = useState<string[]>([])
  const [schemas, setSchemas] = useState<string[]>([])
  const [selectedDb, setSelectedDb] = useState<string>('')
  const [selectedSchema, setSelectedSchema] = useState<string>('')

  // Pan / zoom state
  const [transform, setTransform] = useState({ x: 20, y: 20, scale: 1 })
  const [cursorMode, setCursorMode] = useState<'default' | 'grabbing'>('default')
  const isPanning = useRef(false)
  const lastMouse = useRef({ x: 0, y: 0 })
  const containerRef = useRef<HTMLDivElement>(null)

  // Node dragging state
  const draggingNodeId = useRef<string | null>(null)
  const dragNodeOffset = useRef({ x: 0, y: 0 })

  // IDB key for current view
  const idbKey = activeConnectionId && selectedSchema
    ? `${activeConnectionId}:${selectedDb}:${selectedSchema}`
    : null

  const nodeMap = new Map(nodes.map((n) => [n.id, n]))

  const totalWidth = Math.max(...nodes.map((n) => n.x + n.width), COLS * (NODE_WIDTH + H_GAP)) + H_GAP
  const totalHeight = Math.max(...nodes.map((n) => n.y + n.height), 400) + V_GAP

  const zoomIn = () => setTransform((t) => ({ ...t, scale: Math.min(t.scale * 1.2, 3) }))
  const zoomOut = () => setTransform((t) => ({ ...t, scale: Math.max(t.scale / 1.2, 0.2) }))
  const zoomReset = () => setTransform({ x: 20, y: 20, scale: 1 })

  const loadDiagram = useCallback(async (schema: string, db: string) => {
    if (!activeConnectionId || !schema) return
    setLoading(true)
    setError(null)
    try {
      const tables = await invoke('schema:tables', activeConnectionId, schema, db)

      const columnEntries = await Promise.all(
        tables.map(async (t) => {
          const cols = await invoke('schema:columns', activeConnectionId, t.name, schema, db)
          return [t.name, cols] as [string, ColumnInfo[]]
        })
      )
      const columnsByTable: Record<string, ColumnInfo[]> = Object.fromEntries(columnEntries)

      const relationships = await invoke('schema:relationships', activeConnectionId, schema, db)

      const layouted = layoutNodes(tables, columnsByTable)

      // Load saved positions from IndexedDB
      const key = `${activeConnectionId}:${db}:${schema}`
      const saved = await loadPositions(key)
      if (saved) {
        for (const node of layouted) {
          if (saved[node.id]) {
            node.x = saved[node.id].x
            node.y = saved[node.id].y
          }
        }
      }

      const builtEdges: Edge[] = relationships
        .filter((r) => layouted.some((n) => n.id === r.sourceTable) && layouted.some((n) => n.id === r.targetTable))
        .map((r) => ({ id: r.constraintName, rel: r }))

      setNodes(layouted)
      setEdges(builtEdges)
    } catch (err) {
      setError((err as Error).message ?? 'Failed to load schema')
    } finally {
      setLoading(false)
    }
  }, [activeConnectionId])

  const loadMeta = useCallback(async (db?: string) => {
    if (!activeConnectionId) return
    setLoading(true)
    setError(null)
    try {
      let targetDb = db
      if (!targetDb) {
        const [dbs, defDb] = await Promise.all([
          invoke('schema:databases', activeConnectionId),
          invoke('schema:default-database', activeConnectionId),
        ])
        setDatabases(dbs)
        targetDb = defDb || dbs[0] || ''
        setSelectedDb(targetDb)
      }
      if (!targetDb) {
        setNodes([])
        setEdges([])
        setLoading(false)
        return
      }
      const schemaList = await invoke('schema:schemas', activeConnectionId, targetDb)
      setSchemas(schemaList)
      const defaultSchema = schemaList.includes('public') ? 'public' : (schemaList[0] ?? '')
      setSelectedSchema(defaultSchema)
    } catch (err) {
      setError((err as Error).message ?? 'Failed to load metadata')
      setLoading(false)
    }
  }, [activeConnectionId])

  useEffect(() => {
    if (activeConnectionId) {
      setDatabases([])
      setSchemas([])
      setSelectedDb('')
      setSelectedSchema('')
      setNodes([])
      setEdges([])
      loadMeta()
    }
  }, [activeConnectionId]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (selectedSchema) {
      loadDiagram(selectedSchema, selectedDb)
    }
  }, [selectedSchema, selectedDb]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleDbChange = (db: string) => {
    setSelectedDb(db)
    setSchemas([])
    setSelectedSchema('')
    setNodes([])
    setEdges([])
    loadMeta(db)
  }

  const handleSchemaChange = (schema: string) => setSelectedSchema(schema)

  // ── Node drag start (from card header mousedown) ──────────────────────────
  const onNodeDragStart = useCallback((e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation() // prevent canvas pan
    const node = nodes.find((n) => n.id === nodeId)
    if (!node) return
    draggingNodeId.current = nodeId
    // offset in SVG space: mouse position converted via scale
    const svgX = (e.clientX - transform.x) / transform.scale
    const svgY = (e.clientY - transform.y) / transform.scale
    dragNodeOffset.current = { x: svgX - node.x, y: svgY - node.y }
    setCursorMode('grabbing')
  }, [nodes, transform])

  // ── Canvas mousedown (pan) ────────────────────────────────────────────────
  const onMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return
    isPanning.current = true
    setCursorMode('grabbing')
    lastMouse.current = { x: e.clientX, y: e.clientY }
  }

  const onMouseMove = (e: React.MouseEvent) => {
    if (draggingNodeId.current) {
      const svgX = (e.clientX - transform.x) / transform.scale
      const svgY = (e.clientY - transform.y) / transform.scale
      const newX = svgX - dragNodeOffset.current.x
      const newY = svgY - dragNodeOffset.current.y
      setNodes((prev) => prev.map((n) =>
        n.id === draggingNodeId.current ? { ...n, x: newX, y: newY } : n
      ))
      return
    }
    if (!isPanning.current) return
    const dx = e.clientX - lastMouse.current.x
    const dy = e.clientY - lastMouse.current.y
    lastMouse.current = { x: e.clientX, y: e.clientY }
    setTransform((t) => ({ ...t, x: t.x + dx, y: t.y + dy }))
  }

  const onMouseUp = useCallback(() => {
    if (draggingNodeId.current && idbKey) {
      // Persist all positions to IndexedDB
      setNodes((prev) => {
        const positions: Record<string, { x: number; y: number }> = {}
        for (const n of prev) positions[n.id] = { x: n.x, y: n.y }
        savePositions(idbKey, positions)
        return prev
      })
      draggingNodeId.current = null
    }
    isPanning.current = false
    setCursorMode('default')
  }, [idbKey])

  // Wheel scrolls the canvas — use buttons for zoom
  const onWheel = (e: React.WheelEvent) => {
    setTransform((t) => ({ ...t, x: t.x - e.deltaX, y: t.y - e.deltaY }))
  }

  // ── Empty / loading states ───────────────────────────────────────────────
  if (!activeConnectionId) {
    return (
      <div className="flex flex-1 items-center justify-center" style={{ color: 'var(--color-muted-foreground)' }}>
        <div className="text-center space-y-2">
          <Network size={40} className="mx-auto opacity-20" />
          <p className="text-sm">Connect to a database to view the ER diagram</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden" style={{ background: 'var(--color-background)' }}>
      {/* Toolbar */}
      <div
        className="flex items-center gap-2 px-3 shrink-0"
        style={{ height: 36, borderBottom: '1px solid var(--color-border)', background: '#0d0d0d' }}
      >
        <Network size={14} style={{ color: 'var(--color-primary)' }} />
        <span className="text-xs font-semibold" style={{ color: 'var(--color-foreground)' }}>
          ER Diagram
        </span>
        {databases.length > 0 && (
          <select
            value={selectedDb}
            onChange={(e) => handleDbChange(e.target.value)}
            className="text-xs rounded px-1 py-0.5"
            style={{ background: '#0d0d0d', color: 'var(--color-foreground)', border: '1px solid transparent', outline: 'none', cursor: 'pointer' }}
            onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--color-border)' }}
            onBlur={(e) => { e.currentTarget.style.borderColor = 'transparent' }}
          >
            {databases.map((db) => <option key={db} value={db}>{db}</option>)}
          </select>
        )}
        {schemas.length > 0 && (
          <select
            value={selectedSchema}
            onChange={(e) => handleSchemaChange(e.target.value)}
            className="text-xs rounded px-1 py-0.5"
            style={{ background: '#0d0d0d', color: 'var(--color-foreground)', border: '1px solid transparent', outline: 'none', cursor: 'pointer' }}
            onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--color-border)' }}
            onBlur={(e) => { e.currentTarget.style.borderColor = 'transparent' }}
          >
            {schemas.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        )}
        <div className="flex-1" />
        <span className="text-xs" style={{ color: 'var(--color-muted-foreground)' }}>
          {nodes.length} tables · {edges.length} relationships
        </span>
        {/* Zoom controls */}
        <div className="flex items-center gap-0.5" style={{ borderLeft: '1px solid var(--color-border)', paddingLeft: 8, marginLeft: 4 }}>
          <button onClick={zoomOut} className="flex items-center justify-center rounded p-1 hover:text-white" style={{ color: 'var(--color-muted-foreground)', background: 'transparent', border: 'none', cursor: 'pointer' }} title="Zoom out">
            <ZoomOut size={13} />
          </button>
          <span className="text-xs tabular-nums" style={{ color: 'var(--color-muted-foreground)', minWidth: 36, textAlign: 'center' }}>
            {Math.round(transform.scale * 100)}%
          </span>
          <button onClick={zoomIn} className="flex items-center justify-center rounded p-1 hover:text-white" style={{ color: 'var(--color-muted-foreground)', background: 'transparent', border: 'none', cursor: 'pointer' }} title="Zoom in">
            <ZoomIn size={13} />
          </button>
          <button onClick={zoomReset} className="flex items-center justify-center rounded p-1 hover:text-white" style={{ color: 'var(--color-muted-foreground)', background: 'transparent', border: 'none', cursor: 'pointer' }} title="Reset view">
            <Maximize2 size={13} />
          </button>
        </div>
        <button
          onClick={() => selectedSchema && loadDiagram(selectedSchema, selectedDb)}
          disabled={loading || !selectedSchema}
          className="flex items-center gap-1 rounded px-2 py-1 text-xs transition-colors hover:text-white disabled:opacity-50"
          style={{ color: 'var(--color-muted-foreground)', background: 'transparent', border: 'none', cursor: 'pointer' }}
          title="Refresh"
        >
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Error banner */}
      {error && (
        <div className="flex items-center gap-2 px-3 py-2 text-xs shrink-0" style={{ background: 'rgba(239,68,68,0.1)', color: '#f87171', borderBottom: '1px solid rgba(239,68,68,0.2)' }}>
          <AlertCircle size={12} />
          {error}
        </div>
      )}

      {/* Loading overlay */}
      {loading && (
        <div className="flex flex-1 items-center justify-center" style={{ color: 'var(--color-muted-foreground)' }}>
          <div className="flex flex-col items-center gap-3">
            <RefreshCw size={24} className="animate-spin" style={{ color: 'var(--color-primary)' }} />
            <span className="text-sm">Loading schema…</span>
          </div>
        </div>
      )}

      {/* Main area: field list + canvas */}
      {!loading && (
        <div className="flex flex-1 overflow-hidden">
          {/* Canvas */}
          <div
            ref={containerRef}
            className="flex-1 overflow-hidden"
            style={{ cursor: cursorMode === 'grabbing' ? 'grabbing' : 'grab', position: 'relative' }}
            onMouseDown={onMouseDown}
            onMouseMove={onMouseMove}
            onMouseUp={onMouseUp}
            onMouseLeave={onMouseUp}
            onWheel={onWheel}
          >
            {nodes.length === 0 && !error && (
              <div className="flex h-full items-center justify-center" style={{ color: 'var(--color-muted-foreground)' }}>
                <p className="text-sm">No tables found in this schema</p>
              </div>
            )}

            {nodes.length > 0 && (
              <>
                <svg
                  style={{
                    transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
                    transformOrigin: '0 0',
                    overflow: 'visible',
                    width: totalWidth,
                    height: totalHeight,
                    display: 'block',
                  }}
                >
                  <defs>
                    <marker id="crow-foot-many" markerWidth="12" markerHeight="14" refX="10" refY="7" orient="auto-start-reverse">
                      <line x1="0" y1="7"  x2="10" y2="2"  stroke="#7B9FD4" strokeWidth="1.5"/>
                      <line x1="0" y1="7"  x2="10" y2="7"  stroke="#7B9FD4" strokeWidth="1.5"/>
                      <line x1="0" y1="7"  x2="10" y2="12" stroke="#7B9FD4" strokeWidth="1.5"/>
                    </marker>
                    <marker id="one-end" markerWidth="8" markerHeight="14" refX="6" refY="7" orient="auto">
                      <line x1="6" y1="1" x2="6" y2="13" stroke="#7B9FD4" strokeWidth="1.5"/>
                    </marker>
                    <pattern id="dot-grid" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
                      <circle cx="1" cy="1" r="0.8" fill="rgba(255,255,255,0.06)"/>
                    </pattern>
                  </defs>

                  <rect x="-5000" y="-5000" width="10000" height="10000" fill="url(#dot-grid)"/>

                  <g>
                    {edges.map((edge) => (
                      <EdgeLine key={edge.id} edge={edge} nodeMap={nodeMap} />
                    ))}
                  </g>

                  <g>
                    {nodes.map((node) => (
                      <TableNodeCard key={node.id} node={node} onDragStart={onNodeDragStart} />
                    ))}
                  </g>
                </svg>

                {/* Canvas overlay: zoom + drag hint */}
                <div
                  style={{
                    position: 'absolute',
                    bottom: 14,
                    right: 14,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 2,
                    pointerEvents: 'none',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      background: 'rgba(0,0,0,0.55)',
                      borderRadius: 6,
                      padding: '4px 8px',
                      pointerEvents: 'auto',
                    }}
                  >
                    <button onClick={zoomOut} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.5)', padding: '2px 4px', fontSize: 14, lineHeight: 1 }} title="Zoom out">−</button>
                    <span
                      onClick={zoomReset}
                      style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', minWidth: 34, textAlign: 'center', cursor: 'pointer', userSelect: 'none' }}
                      title="Reset zoom"
                    >
                      {Math.round(transform.scale * 100)}%
                    </span>
                    <button onClick={zoomIn} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.5)', padding: '2px 4px', fontSize: 14, lineHeight: 1 }} title="Zoom in">+</button>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)', userSelect: 'none' }}>
                      drag header to move · scroll to pan
                    </span>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
