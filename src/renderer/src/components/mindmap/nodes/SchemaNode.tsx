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
