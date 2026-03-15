import { useEffect } from 'react'
import { Database, Loader2, Pencil, Trash2 } from 'lucide-react'
import { useConnectionStore } from '../../stores/connection-store'
import { DatabaseTree } from './DatabaseTree'
import type { SavedConnection } from '@shared/types/connection'

const DIALECT_COLORS: Record<string, string> = {
  postgresql: '#336791',
  mysql: '#f29111',
  mariadb: '#c0765a',
  mongodb: '#589636',
  clickhouse: '#ffcc02',
  mssql: '#cc2927',
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
  const { connections, activeConnectionId, loading, loadConnections, connectTo, disconnectFrom, deleteConnection } =
    useConnectionStore()

  useEffect(() => { loadConnections() }, [])

  if (loading) {
    return (
      <div className="flex items-center gap-2 px-3 py-3">
        <Loader2 size={12} className="animate-spin" style={{ color: 'var(--color-text-muted)' }} />
        <span style={{ color: 'var(--color-text-muted)', fontSize: 12 }}>Loading...</span>
      </div>
    )
  }

  if (connections.length === 0) {
    return (
      <div className="px-3 py-4 text-center">
        <Database size={24} className="mx-auto mb-2 opacity-20" style={{ color: 'var(--color-text-muted)' }} />
        <p style={{ color: 'var(--color-text-muted)', fontSize: 12 }}>No connections yet</p>
      </div>
    )
  }

  return (
    <div className="py-0.5">
      {connections.map((conn) => {
        const isActive = conn.id === activeConnectionId
        const color = DIALECT_COLORS[conn.type] ?? '#888'
        const label = DIALECT_LABELS[conn.type] ?? '??'

        return (
          <div key={conn.id}>
            <div
              className="group flex items-center gap-2 px-2 mx-1 rounded cursor-pointer transition-colors"
              style={{
                height: 30,
                background: isActive ? 'rgba(59,130,246,0.12)' : 'transparent',
              }}
              onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = 'var(--color-bg-subtle)' }}
              onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = 'transparent' }}
            >
              {/* Connection status dot */}
              <span
                className="h-1.5 w-1.5 shrink-0 rounded-full"
                style={{ background: isActive ? '#22C55E' : 'var(--color-text-muted)' }}
              />

              {/* DB type badge */}
              <div
                className="flex h-5 w-7 shrink-0 items-center justify-center rounded text-white"
                style={{ background: color, fontSize: 9, fontWeight: 700, letterSpacing: '0.03em' }}
              >
                {label}
              </div>

              {/* Connection name / connect toggle */}
              <button
                onClick={() => isActive ? disconnectFrom(conn.id) : connectTo(conn.id)}
                className="flex flex-1 items-center gap-1.5 min-w-0 text-left"
              >
                <span
                  className="truncate"
                  style={{
                    fontSize: 12,
                    fontFamily: 'var(--font-sans)',
                    color: isActive ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
                  }}
                >
                  {conn.name}
                </span>
                {!isActive && (
                  <span
                    className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity px-1 rounded"
                    style={{ fontSize: 10, color: 'var(--color-primary)', border: '1px solid var(--color-primary)' }}
                  >
                    Connect
                  </span>
                )}
              </button>

              {/* Edit */}
              {onEdit && (
                <button
                  onClick={(e) => { e.stopPropagation(); onEdit(conn) }}
                  className="flex h-5 w-5 shrink-0 items-center justify-center rounded opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{ color: 'var(--color-text-muted)' }}
                  onMouseEnter={(e) => e.currentTarget.style.color = 'var(--color-text-primary)'}
                  onMouseLeave={(e) => e.currentTarget.style.color = 'var(--color-text-muted)'}
                  title="Edit connection"
                >
                  <Pencil size={11} />
                </button>
              )}

              {/* Delete */}
              <button
                onClick={(e) => { e.stopPropagation(); deleteConnection(conn.id) }}
                className="flex h-5 w-5 shrink-0 items-center justify-center rounded opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ color: 'var(--color-text-muted)' }}
                onMouseEnter={(e) => e.currentTarget.style.color = 'var(--color-destructive)'}
                onMouseLeave={(e) => e.currentTarget.style.color = 'var(--color-text-muted)'}
                title="Delete connection"
              >
                <Trash2 size={11} />
              </button>
            </div>

            {/* Inline schema tree for active connection */}
            {isActive && (
              <div className="ml-2 mt-0.5 mb-1">
                <DatabaseTree connectionId={conn.id} />
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
