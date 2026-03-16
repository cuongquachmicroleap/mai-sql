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
