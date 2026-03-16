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
