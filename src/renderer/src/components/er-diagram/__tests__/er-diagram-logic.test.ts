import { describe, it, expect } from 'vitest'

// Mock React and all UI dependencies — we only test pure layout functions
vi.mock('react', () => ({
  useState: vi.fn(),
  useEffect: vi.fn(),
  useRef: vi.fn(() => ({ current: null })),
  useCallback: vi.fn((fn: unknown) => fn),
}))

vi.mock('lucide-react', () => ({
  RefreshCw: {},
  Network: {},
  AlertCircle: {},
  ZoomIn: {},
  ZoomOut: {},
  Maximize2: {},
  GripVertical: {},
}))

vi.mock('../../../lib/ipc-client', () => ({ invoke: vi.fn() }))
vi.mock('../../../stores/connection-store', () => ({
  useConnectionStore: vi.fn(() => ({ activeConnectionId: null })),
}))

import { nodeHeight, layoutNodes, edgeAnchor, buildPath } from '../ERDiagram'
import type { ColumnInfo, TableInfo } from '@shared/types/schema'

// ─── Constants (mirror ERDiagram.tsx) ────────────────────────────────────────
const NODE_HEADER_HEIGHT = 30
const NODE_ROW_HEIGHT = 24
const NODE_PADDING_BOTTOM = 8
const NODE_WIDTH = 260
const H_GAP = 80
const V_GAP = 100
const COLS = 4

// ─── Helpers ─────────────────────────────────────────────────────────────────

function col(name: string, overrides: Partial<ColumnInfo> = {}): ColumnInfo {
  return {
    name,
    type: 'integer',
    displayType: 'int4',
    isNullable: false,
    isPrimaryKey: false,
    isForeignKey: false,
    defaultValue: null,
    ...overrides,
  }
}

function table(name: string): TableInfo {
  return { name, schema: 'public', type: 'table' }
}

// ─── nodeHeight ───────────────────────────────────────────────────────────────

describe('nodeHeight', () => {
  it('returns header + padding for empty column list', () => {
    expect(nodeHeight([])).toBe(NODE_HEADER_HEIGHT + 0 * NODE_ROW_HEIGHT + NODE_PADDING_BOTTOM)
  })

  it('adds NODE_ROW_HEIGHT per column', () => {
    const cols = [col('id'), col('name'), col('email')]
    expect(nodeHeight(cols)).toBe(NODE_HEADER_HEIGHT + 3 * NODE_ROW_HEIGHT + NODE_PADDING_BOTTOM)
  })

  it('scales linearly with column count', () => {
    for (let n = 0; n <= 10; n++) {
      const cols = Array.from({ length: n }, (_, i) => col(`c${i}`))
      const expected = NODE_HEADER_HEIGHT + n * NODE_ROW_HEIGHT + NODE_PADDING_BOTTOM
      expect(nodeHeight(cols)).toBe(expected)
    }
  })
})

// ─── layoutNodes ──────────────────────────────────────────────────────────────

describe('layoutNodes', () => {
  it('returns one node per table', () => {
    const tables = [table('users'), table('orders'), table('products')]
    const nodes = layoutNodes(tables, {})
    expect(nodes).toHaveLength(3)
  })

  it('assigns correct ids from table names', () => {
    const tables = [table('users'), table('orders')]
    const nodes = layoutNodes(tables, {})
    expect(nodes.map((n) => n.id)).toEqual(['users', 'orders'])
  })

  it('sets node width to NODE_WIDTH', () => {
    const nodes = layoutNodes([table('t')], {})
    expect(nodes[0].width).toBe(NODE_WIDTH)
  })

  it('lays out first 4 nodes in a single row', () => {
    const tables = Array.from({ length: 4 }, (_, i) => table(`t${i}`))
    const nodes = layoutNodes(tables, {})
    const rows = nodes.map((n) => Math.floor(nodes.indexOf(n) / COLS))
    expect(new Set(rows)).toEqual(new Set([0]))
  })

  it('wraps to next row after COLS columns', () => {
    const tables = Array.from({ length: COLS + 1 }, (_, i) => table(`t${i}`))
    const nodes = layoutNodes(tables, {})
    const lastNode = nodes[COLS]
    // fifth node should be in column 0 of row 1
    expect(lastNode.x).toBe(0)
  })

  it('uses correct x spacing: col * (NODE_WIDTH + H_GAP)', () => {
    const tables = [table('a'), table('b'), table('c')]
    const nodes = layoutNodes(tables, {})
    expect(nodes[0].x).toBe(0)
    expect(nodes[1].x).toBe(NODE_WIDTH + H_GAP)
    expect(nodes[2].x).toBe(2 * (NODE_WIDTH + H_GAP))
  })

  it('uses empty columns array when table not in columnsByTable', () => {
    const tables = [table('unknown')]
    const nodes = layoutNodes(tables, {})
    expect(nodes[0].columns).toEqual([])
  })

  it('uses provided columns for matching table', () => {
    const cols = [col('id', { isPrimaryKey: true }), col('name')]
    const nodes = layoutNodes([table('users')], { users: cols })
    expect(nodes[0].columns).toBe(cols)
  })

  it('height matches nodeHeight for the table columns', () => {
    const cols = [col('id'), col('name'), col('email')]
    const nodes = layoutNodes([table('users')], { users: cols })
    expect(nodes[0].height).toBe(nodeHeight(cols))
  })

  it('table reference is preserved on node', () => {
    const t = table('products')
    const nodes = layoutNodes([t], {})
    expect(nodes[0].table).toBe(t)
  })
})

// ─── edgeAnchor ───────────────────────────────────────────────────────────────

describe('edgeAnchor', () => {
  const baseNode = {
    id: 'users',
    table: table('users'),
    columns: [],
    x: 100,
    y: 200,
    width: NODE_WIDTH,
    height: 100,
  }

  it('right anchor x = node.x + node.width', () => {
    const anchor = edgeAnchor(baseNode, 'right', 0)
    expect(anchor.x).toBe(baseNode.x + baseNode.width)
  })

  it('left anchor x = node.x', () => {
    const anchor = edgeAnchor(baseNode, 'left', 0)
    expect(anchor.x).toBe(baseNode.x)
  })

  it('y for rowIndex 0 = y + header + 0 + half row', () => {
    const anchor = edgeAnchor(baseNode, 'left', 0)
    const expected = baseNode.y + NODE_HEADER_HEIGHT + 0 * NODE_ROW_HEIGHT + NODE_ROW_HEIGHT / 2
    expect(anchor.y).toBe(expected)
  })

  it('y for rowIndex 2 = y + header + 2 rows + half row', () => {
    const anchor = edgeAnchor(baseNode, 'right', 2)
    const expected = baseNode.y + NODE_HEADER_HEIGHT + 2 * NODE_ROW_HEIGHT + NODE_ROW_HEIGHT / 2
    expect(anchor.y).toBe(expected)
  })

  it('y does not depend on side', () => {
    const left = edgeAnchor(baseNode, 'left', 1)
    const right = edgeAnchor(baseNode, 'right', 1)
    expect(left.y).toBe(right.y)
  })
})

// ─── buildPath ────────────────────────────────────────────────────────────────

describe('buildPath', () => {
  it('starts with M sx sy', () => {
    const path = buildPath(10, 20, 100, 50)
    expect(path.startsWith('M 10 20')).toBe(true)
  })

  it('ends at tx ty', () => {
    const path = buildPath(10, 20, 100, 50)
    expect(path.endsWith(', 100 50')).toBe(true)
  })

  it('is a cubic bezier (contains C)', () => {
    const path = buildPath(0, 0, 200, 100)
    expect(path).toMatch(/^M \d+ \d+ C /)
  })

  it('same x produces control point offset of at least 40', () => {
    // dx=0, cx = max(40, 0*0.5) = 40
    const path = buildPath(100, 50, 100, 150)
    // control x for source should be 100 - 40 = 60 (sx >= tx, so subtract)
    expect(path).toContain('60 50')
  })

  it('large dx uses 50% control offset', () => {
    // dx=200, cx=100; sx<tx so csx=0+100=100, ctx=200-100=100
    const path = buildPath(0, 0, 200, 100)
    // C 100 0, 100 100, 200 100
    expect(path).toBe('M 0 0 C 100 0, 100 100, 200 100')
  })

  it('rightward edge: control points push forward', () => {
    const path = buildPath(0, 0, 100, 0)
    // cx=max(40,50)=50; csx=50, ctx=50
    expect(path).toBe('M 0 0 C 50 0, 50 0, 100 0')
  })

  it('leftward edge (sx > tx): control points pull back', () => {
    // sx=200 > tx=0: csx = 200-cx, ctx = 0+cx; dx=200,cx=100
    const path = buildPath(200, 0, 0, 0)
    // C 100 0, 100 0, 0 0
    expect(path).toBe('M 200 0 C 100 0, 100 0, 0 0')
  })
})
