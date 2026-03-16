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
          cursor: 'pointer', fontSize: 12, fontFamily: 'inherit',
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
