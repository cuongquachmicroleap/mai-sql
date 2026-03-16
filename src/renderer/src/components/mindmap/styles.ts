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
