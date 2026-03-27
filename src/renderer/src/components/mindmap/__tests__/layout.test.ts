import { describe, it, expect, vi } from 'vitest'
import type { Node, Edge } from '@xyflow/react'

// Mock dagre so tests run in node env without native deps
vi.mock('dagre', () => {
  const nodeData = new Map<string, { width: number; height: number; x: number; y: number }>()
  const edgeData: { source: string; target: string }[] = []

  const mockGraph = {
    setDefaultEdgeLabel: vi.fn().mockReturnThis(),
    setGraph: vi.fn().mockReturnThis(),
    setNode: vi.fn((id: string, data: { width: number; height: number }) => {
      // Place nodes in a simple left-to-right sequence for predictability
      const idx = nodeData.size
      nodeData.set(id, { ...data, x: idx * 300 + 150, y: 150 })
    }),
    setEdge: vi.fn((source: string, target: string) => {
      edgeData.push({ source, target })
    }),
    node: vi.fn((id: string) => nodeData.get(id) ?? { x: 0, y: 0, width: 200, height: 60 }),
  }

  return {
    default: {
      graphlib: {
        Graph: vi.fn(() => {
          // reset per call
          nodeData.clear()
          edgeData.length = 0
          return mockGraph
        }),
      },
      layout: vi.fn(),
    },
  }
})

import { getLayoutedElements } from '../layout'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeNode(id: string, overrides: Partial<Node> = {}): Node {
  return {
    id,
    position: { x: 0, y: 0 },
    data: {},
    type: 'default',
    width: 200,
    height: 60,
    ...overrides,
  }
}

function makeEdge(id: string, source: string, target: string): Edge {
  return { id, source, target }
}

// ─── getLayoutedElements ──────────────────────────────────────────────────────

describe('getLayoutedElements', () => {
  it('returns same number of nodes as input', () => {
    const nodes = [makeNode('a'), makeNode('b'), makeNode('c')]
    const edges = [makeEdge('e1', 'a', 'b')]
    const { nodes: out } = getLayoutedElements(nodes, edges)
    expect(out).toHaveLength(3)
  })

  it('returns same edges (unmodified)', () => {
    const nodes = [makeNode('a'), makeNode('b')]
    const edges = [makeEdge('e1', 'a', 'b')]
    const { edges: outEdges } = getLayoutedElements(nodes, edges)
    expect(outEdges).toBe(edges)
  })

  it('sets position on each output node', () => {
    const nodes = [makeNode('a'), makeNode('b')]
    const { nodes: out } = getLayoutedElements(nodes, [])
    for (const n of out) {
      expect(n.position).toBeDefined()
      expect(typeof n.position.x).toBe('number')
      expect(typeof n.position.y).toBe('number')
    }
  })

  it('preserves node id on output', () => {
    const nodes = [makeNode('db-node'), makeNode('schema-node')]
    const { nodes: out } = getLayoutedElements(nodes, [])
    expect(out.map((n) => n.id)).toEqual(['db-node', 'schema-node'])
  })

  it('preserves node data on output', () => {
    const data = { label: 'users', kind: 'table' }
    const nodes = [makeNode('t1', { data })]
    const { nodes: out } = getLayoutedElements(nodes, [])
    expect(out[0].data).toBe(data)
  })

  it('works with empty node and edge lists', () => {
    const { nodes, edges } = getLayoutedElements([], [])
    expect(nodes).toHaveLength(0)
    expect(edges).toHaveLength(0)
  })

  it('works with a single node', () => {
    const { nodes: out } = getLayoutedElements([makeNode('solo')], [])
    expect(out).toHaveLength(1)
    expect(out[0].id).toBe('solo')
  })

  it('uses measured dimensions when available', () => {
    // measured.width/height should override width/height defaults
    const nodes = [
      makeNode('x', { measured: { width: 400, height: 120 }, width: 200, height: 60 }),
    ]
    const { nodes: out } = getLayoutedElements(nodes, [])
    expect(out[0].position).toBeDefined()
  })

  it('uses nodeWidth/nodeHeight options as fallback dimensions', () => {
    const nodes = [makeNode('n', { width: undefined, height: undefined })]
    // should not throw even with no width/height on node
    expect(() => getLayoutedElements(nodes, [], { nodeWidth: 300, nodeHeight: 80 })).not.toThrow()
  })

  it('accepts direction option TB without throwing', () => {
    const nodes = [makeNode('a'), makeNode('b')]
    expect(() => getLayoutedElements(nodes, [], { direction: 'TB' })).not.toThrow()
  })

  it('accepts direction option LR without throwing', () => {
    const nodes = [makeNode('a'), makeNode('b')]
    expect(() => getLayoutedElements(nodes, [], { direction: 'LR' })).not.toThrow()
  })

  it('position offsets by half node dimensions (center-to-corner)', () => {
    // Dagre returns center points; getLayoutedElements must subtract half size
    // With our mock: node 'a' gets x=150, y=150, width=200, height=60
    // expected position: x = 150 - 200/2 = 50, y = 150 - 60/2 = 120
    const nodes = [makeNode('a', { width: 200, height: 60 })]
    const { nodes: out } = getLayoutedElements(nodes, [], {})
    expect(out[0].position.x).toBe(150 - 200 / 2)
    expect(out[0].position.y).toBe(150 - 60 / 2)
  })

  it('handles multiple edges between same nodes', () => {
    const nodes = [makeNode('x'), makeNode('y')]
    const edges = [makeEdge('e1', 'x', 'y'), makeEdge('e2', 'x', 'y')]
    const { edges: out } = getLayoutedElements(nodes, edges)
    expect(out).toHaveLength(2)
  })
})
