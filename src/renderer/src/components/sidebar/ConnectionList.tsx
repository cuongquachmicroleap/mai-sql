import { useEffect, useState } from 'react'
import { Database, Loader2, Pencil, Trash2 } from 'lucide-react'
import { useConnectionStore } from '../../stores/connection-store'
import { DatabaseTree } from './DatabaseTree'
import type { SavedConnection } from '@shared/types/connection'

const DIALECT_COLORS: Record<string, string> = {
  postgresql: '#336791',
  mysql: '#F29111',
  mariadb: '#C0765A',
  mongodb: '#589636',
  clickhouse: '#FFCC02',
  mssql: '#CC2927',
}

const DIALECT_LABELS: Record<string, string> = {
  postgresql: 'PG',
  mysql: 'MY',
  mariadb: 'MA',
  mongodb: 'MG',
  clickhouse: 'CH',
  mssql: 'MS',
}

interface ConnectionListProps {
  onEdit?: (connection: SavedConnection) => void
}

export function ConnectionList({ onEdit }: ConnectionListProps) {
  const {
    connections, activeConnectionId, loading,
    loadConnections, connectTo, disconnectFrom, deleteConnection,
  } = useConnectionStore()

  const [hoveredId, setHoveredId] = useState<string | null>(null)

  useEffect(() => { loadConnections() }, [])

  if (loading) {
    return (
      <div className="flex items-center gap-2 px-3 py-3">
        <Loader2 size={12} className="animate-spin" style={{ color: '#555560' }} />
        <span style={{ color: '#555560', fontSize: 12 }}>Loading...</span>
      </div>
    )
  }

  if (connections.length === 0) {
    return (
      <div className="px-3 py-4 text-center">
        <Database
          size={24}
          className="mx-auto mb-2"
          style={{ color: '#555560', opacity: 0.4, display: 'block', margin: '0 auto 8px' }}
        />
        <p style={{ color: '#555560', fontSize: 12 }}>No connections yet</p>
      </div>
    )
  }

  return (
    <div className="py-0.5">
      {connections.map((conn) => {
        const isActive = conn.id === activeConnectionId
        const isHovered = hoveredId === conn.id
        const color = DIALECT_COLORS[conn.type] ?? '#555560'
        const label = DIALECT_LABELS[conn.type] ?? '??'

        return (
          <div key={conn.id}>
            <div
              className="flex items-center gap-2 px-2 mx-1 rounded cursor-pointer"
              style={{
                height: 32,
                background: isActive
                  ? 'rgba(91,138,240,0.12)'
                  : isHovered
                    ? 'rgba(255,255,255,0.04)'
                    : 'transparent',
                transition: 'background 0.12s',
              }}
              onMouseEnter={() => setHoveredId(conn.id)}
              onMouseLeave={() => setHoveredId(null)}
            >
              {/* Connection status dot */}
              <span
                className="h-1.5 w-1.5 shrink-0 rounded-full"
                style={{ background: isActive ? '#34D399' : '#3A3A45' }}
              />

              {/* DB type badge */}
              <div
                className="flex shrink-0 items-center justify-center rounded"
                style={{
                  background: color,
                  color: color === '#FFCC02' ? '#1a1a00' : '#ffffff',
                  fontSize: 9,
                  fontWeight: 700,
                  letterSpacing: '0.03em',
                  height: 18,
                  minWidth: 24,
                  padding: '0 4px',
                }}
              >
                {label}
              </div>

              {/* Connection name / connect toggle */}
              <button
                onClick={() => isActive ? disconnectFrom(conn.id) : connectTo(conn.id)}
                className="flex flex-1 items-center gap-1.5 min-w-0 text-left"
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
              >
                <span
                  className="truncate"
                  style={{
                    fontSize: 13,
                    color: isActive ? '#ECECEC' : '#8B8B8B',
                  }}
                >
                  {conn.name}
                </span>
                {!isActive && isHovered && (
                  <span
                    className="shrink-0 px-1 rounded"
                    style={{
                      fontSize: 10,
                      color: '#5B8AF0',
                      border: '1px solid rgba(91,138,240,0.4)',
                    }}
                  >
                    Connect
                  </span>
                )}
              </button>

              {/* Edit button — visible on hover */}
              {onEdit && (
                <button
                  onClick={(e) => { e.stopPropagation(); onEdit(conn) }}
                  className="flex items-center justify-center rounded"
                  style={{
                    width: 20,
                    height: 20,
                    flexShrink: 0,
                    color: '#555560',
                    opacity: isHovered ? 1 : 0,
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'opacity 0.12s, color 0.12s',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.color = '#ECECEC'}
                  onMouseLeave={(e) => e.currentTarget.style.color = '#555560'}
                  title="Edit connection"
                >
                  <Pencil size={11} />
                </button>
              )}

              {/* Delete button — visible on hover */}
              <button
                onClick={(e) => { e.stopPropagation(); deleteConnection(conn.id) }}
                className="flex items-center justify-center rounded"
                style={{
                  width: 20,
                  height: 20,
                  flexShrink: 0,
                  color: '#555560',
                  opacity: isHovered ? 1 : 0,
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'opacity 0.12s, color 0.12s',
                }}
                onMouseEnter={(e) => e.currentTarget.style.color = '#F87171'}
                onMouseLeave={(e) => e.currentTarget.style.color = '#555560'}
                title="Delete connection"
              >
                <Trash2 size={11} />
              </button>
            </div>

            {/* Inline schema tree for active connection */}
            {isActive && (
              <div style={{ marginLeft: 8, marginTop: 2, marginBottom: 4 }}>
                <DatabaseTree connectionId={conn.id} />
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
