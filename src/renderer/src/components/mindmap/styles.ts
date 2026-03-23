import type { CSSProperties } from 'react'

export const NODE_COLORS = {
  database: '#34D399',
  schema: '#F5B800',
  table: '#F97316',
  view: '#A78BFA',
  column: 'var(--mai-text-2)',
  pk: '#FBBF24',
  fk: '#F97316',
} as const

export const baseNodeStyle: CSSProperties = {
  background: 'var(--mai-bg-panel)',
  border: '1px solid var(--mai-border-strong)',
  borderRadius: 8,
  color: 'var(--mai-text-1)',
  fontSize: 12,
  fontFamily: 'inherit',
}

export const EDGE_STYLE = {
  stroke: 'var(--mai-border-strong)',
  strokeWidth: 1.5,
} as const

export const EDGE_STYLE_FK = {
  stroke: '#F97316',
  strokeWidth: 1.5,
  strokeDasharray: '6 3',
} as const
