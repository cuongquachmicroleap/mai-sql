import { useState, useEffect, useRef, useCallback } from 'react'
import { RefreshCw, Network, AlertCircle } from 'lucide-react'
import { invoke } from '../../lib/ipc-client'
import { useConnectionStore } from '../../stores/connection-store'
import type { TableInfo, ColumnInfo, Relationship } from '@shared/types/schema'

// ─── Layout constants ────────────────────────────────────────────────────────
const NODE_WIDTH = 220
const NODE_HEADER_HEIGHT = 32
const NODE_ROW_HEIGHT = 22
const NODE_PADDING_BOTTOM = 8
const COLS = 4
const H_GAP = 60
const V_GAP = 80

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
  sourceNode: TableNode
  targetNode: TableNode
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
  col: 'left' | 'right',
  rowIndex: number
): { x: number; y: number } {
  const y = node.y + NODE_HEADER_HEIGHT + rowIndex * NODE_ROW_HEIGHT + NODE_ROW_HEIGHT / 2
  const x = col === 'left' ? node.x : node.x + node.width
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

// ─── Sub-components ──────────────────────────────────────────────────────────
function TableNodeCard({ node }: { node: TableNode }) {
  return (
    <foreignObject x={node.x} y={node.y} width={node.width} height={node.height} overflow="visible">
      <div
        style={{
          width: node.width,
          border: '1px solid var(--color-border)',
          borderRadius: 6,
          overflow: 'hidden',
          background: '#111',
          boxShadow: '0 2px 8px rgba(0,0,0,0.5)',
          fontFamily: 'var(--font-mono, monospace)',
        }}
      >
        {/* Header */}
        <div
          style={{
            height: NODE_HEADER_HEIGHT,
            background: '#1a1a1a',
            borderBottom: '1px solid var(--color-border)',
            display: 'flex',
            alignItems: 'center',
            paddingLeft: 10,
            paddingRight: 10,
          }}
        >
          <span
            style={{
              color: 'var(--color-primary)',
              fontWeight: 600,
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
              paddingLeft: 10,
              paddingRight: 10,
              gap: 4,
              borderBottom: '1px solid rgba(255,255,255,0.04)',
            }}
          >
            {col.isPrimaryKey && (
              <span style={{ fontSize: 9, color: '#facc15', fontWeight: 700, minWidth: 16 }}>PK</span>
            )}
            {!col.isPrimaryKey && col.isForeignKey && (
              <span style={{ fontSize: 9, color: '#fb923c', fontWeight: 700, minWidth: 16 }}>FK</span>
            )}
            {!col.isPrimaryKey && !col.isForeignKey && (
              <span style={{ minWidth: 16 }} />
            )}
            <span
              style={{
                fontSize: 11,
                color: col.isPrimaryKey
                  ? '#fde68a'
                  : col.isForeignKey
                    ? '#fdba74'
                    : 'var(--color-foreground)',
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
                color: 'var(--color-muted-foreground)',
                marginLeft: 'auto',
                whiteSpace: 'nowrap',
              }}
            >
              {col.type}
            </span>
          </div>
        ))}
      </div>
    </foreignObject>
  )
}

function EdgeLine({ edge }: { edge: Edge }) {
  const { sourceNode, targetNode, rel } = edge

  // Find column row index in source/target
  const srcColIdx = sourceNode.columns.findIndex((c) => c.name === rel.sourceColumn)
  const tgtColIdx = targetNode.columns.findIndex((c) => c.name === rel.targetColumn)

  const srcAnchorSide = sourceNode.x < targetNode.x ? 'right' : 'left'
  const tgtAnchorSide = srcAnchorSide === 'right' ? 'left' : 'right'

  const src = edgeAnchor(sourceNode, srcAnchorSide, srcColIdx >= 0 ? srcColIdx : 0)
  const tgt = edgeAnchor(targetNode, tgtAnchorSide, tgtColIdx >= 0 ? tgtColIdx : 0)
  const d = buildPath(src.x, src.y, tgt.x, tgt.y)

  return (
    <g>
      <path
        d={d}
        fill="none"
        stroke="#fb923c"
        strokeWidth={1.5}
        strokeOpacity={0.6}
        strokeDasharray="none"
        markerEnd="url(#arrowhead)"
      />
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

  // Pan / zoom state
  const [transform, setTransform] = useState({ x: 20, y: 20, scale: 1 })
  const isPanning = useRef(false)
  const lastMouse = useRef({ x: 0, y: 0 })
  const containerRef = useRef<HTMLDivElement>(null)

  const totalWidth = Math.max(
    ...nodes.map((n) => n.x + n.width),
    COLS * (NODE_WIDTH + H_GAP)
  ) + H_GAP
  const totalHeight = Math.max(...nodes.map((n) => n.y + n.height), 400) + V_GAP

  const loadDiagram = useCallback(async () => {
    if (!activeConnectionId) return
    setLoading(true)
    setError(null)
    try {
      // 1. Get databases → schemas
      const dbs = await invoke('schema:databases', activeConnectionId)
      if (!dbs.length) {
        setNodes([])
        setEdges([])
        setLoading(false)
        return
      }
      const schemas = await invoke('schema:schemas', activeConnectionId, dbs[0])
      const schema = schemas.includes('public') ? 'public' : schemas[0]
      if (!schema) {
        setNodes([])
        setEdges([])
        setLoading(false)
        return
      }

      // 2. Get tables
      const tables = await invoke('schema:tables', activeConnectionId, schema)

      // 3. Get columns for each table (parallel)
      const columnEntries = await Promise.all(
        tables.map(async (t) => {
          const cols = await invoke('schema:columns', activeConnectionId, t.name)
          return [t.name, cols] as [string, ColumnInfo[]]
        })
      )
      const columnsByTable: Record<string, ColumnInfo[]> = Object.fromEntries(columnEntries)

      // 4. Get relationships
      const relationships = await invoke('schema:relationships', activeConnectionId, schema)

      // 5. Layout
      const layouted = layoutNodes(tables, columnsByTable)
      const nodeMap = new Map(layouted.map((n) => [n.id, n]))

      const builtEdges: Edge[] = relationships
        .filter((r) => nodeMap.has(r.sourceTable) && nodeMap.has(r.targetTable))
        .map((r) => ({
          id: r.constraintName,
          rel: r,
          sourceNode: nodeMap.get(r.sourceTable)!,
          targetNode: nodeMap.get(r.targetTable)!,
        }))

      setNodes(layouted)
      setEdges(builtEdges)
    } catch (err) {
      setError((err as Error).message ?? 'Failed to load schema')
    } finally {
      setLoading(false)
    }
  }, [activeConnectionId])

  useEffect(() => {
    if (activeConnectionId) loadDiagram()
  }, [activeConnectionId, loadDiagram])

  // ── Pan handlers ────────────────────────────────────────────────────────
  const onMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return
    isPanning.current = true
    lastMouse.current = { x: e.clientX, y: e.clientY }
  }

  const onMouseMove = (e: React.MouseEvent) => {
    if (!isPanning.current) return
    const dx = e.clientX - lastMouse.current.x
    const dy = e.clientY - lastMouse.current.y
    lastMouse.current = { x: e.clientX, y: e.clientY }
    setTransform((t) => ({ ...t, x: t.x + dx, y: t.y + dy }))
  }

  const onMouseUp = () => {
    isPanning.current = false
  }

  const onWheel = (e: React.WheelEvent) => {
    e.preventDefault()
    const delta = e.deltaY > 0 ? 0.9 : 1.1
    setTransform((t) => {
      const newScale = Math.min(Math.max(t.scale * delta, 0.2), 3)
      return { ...t, scale: newScale }
    })
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
        <div className="flex-1" />
        <span className="text-xs" style={{ color: 'var(--color-muted-foreground)' }}>
          {nodes.length} tables · {edges.length} relationships
        </span>
        <button
          onClick={loadDiagram}
          disabled={loading}
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
        <div
          className="flex items-center gap-2 px-3 py-2 text-xs shrink-0"
          style={{ background: 'rgba(239,68,68,0.1)', color: '#f87171', borderBottom: '1px solid rgba(239,68,68,0.2)' }}
        >
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

      {/* Canvas */}
      {!loading && (
        <div
          ref={containerRef}
          className="flex-1 overflow-hidden"
          style={{ cursor: 'grab', position: 'relative' }}
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onMouseLeave={onMouseUp}
          onWheel={onWheel}
        >
          {nodes.length === 0 && !error && (
            <div
              className="flex h-full items-center justify-center"
              style={{ color: 'var(--color-muted-foreground)' }}
            >
              <p className="text-sm">No tables found in this schema</p>
            </div>
          )}

          {nodes.length > 0 && (
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
                <marker
                  id="arrowhead"
                  markerWidth="8"
                  markerHeight="8"
                  refX="6"
                  refY="3"
                  orient="auto"
                >
                  <path d="M 0 0 L 6 3 L 0 6 z" fill="#fb923c" fillOpacity={0.7} />
                </marker>
              </defs>

              {/* Edges drawn first (behind nodes) */}
              <g>
                {edges.map((edge) => (
                  <EdgeLine key={edge.id} edge={edge} />
                ))}
              </g>

              {/* Node cards */}
              <g>
                {nodes.map((node) => (
                  <TableNodeCard key={node.id} node={node} />
                ))}
              </g>
            </svg>
          )}
        </div>
      )}
    </div>
  )
}
