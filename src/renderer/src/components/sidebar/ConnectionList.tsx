import { useEffect } from 'react'
import { Database, Loader2, Trash2 } from 'lucide-react'
import { useConnectionStore } from '../../stores/connection-store'

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

export function ConnectionList() {
  const { connections, activeConnectionId, loading, loadConnections, connectTo, disconnectFrom, deleteConnection } =
    useConnectionStore()

  useEffect(() => { loadConnections() }, [])

  if (loading) {
    return (
      <div className="flex items-center gap-2 px-3 py-3">
        <Loader2 size={12} className="animate-spin" style={{ color: 'var(--color-muted-foreground)' }} />
        <span className="text-xs" style={{ color: 'var(--color-muted-foreground)' }}>Loading...</span>
      </div>
    )
  }

  if (connections.length === 0) {
    return (
      <div className="px-3 py-4 text-center">
        <Database size={24} className="mx-auto mb-2 opacity-20" style={{ color: 'var(--color-muted-foreground)' }} />
        <p className="text-xs" style={{ color: 'var(--color-muted-foreground)' }}>No connections yet</p>
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
          <div
            key={conn.id}
            className="group flex items-center gap-2 px-2 py-1.5 mx-1 rounded cursor-pointer transition-colors"
            style={{
              background: isActive ? 'color-mix(in srgb, var(--color-primary) 12%, transparent)' : 'transparent',
            }}
            onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = 'var(--color-muted)' }}
            onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = 'transparent' }}
          >
            {/* DB type badge */}
            <div
              className="flex h-5 w-7 shrink-0 items-center justify-center rounded text-white"
              style={{ background: color, fontSize: 9, fontWeight: 700, letterSpacing: '0.03em' }}
            >
              {label}
            </div>

            {/* Connection name */}
            <button
              onClick={() => isActive ? disconnectFrom(conn.id) : connectTo(conn.id)}
              className="flex flex-1 items-center gap-1.5 min-w-0 text-left"
            >
              <span
                className="truncate text-xs"
                style={{ color: isActive ? 'var(--color-foreground)' : 'var(--color-muted-foreground)' }}
              >
                {conn.name}
              </span>
              {isActive && (
                <span
                  className="h-1.5 w-1.5 shrink-0 rounded-full"
                  style={{ background: '#22c55e' }}
                />
              )}
            </button>

            {/* Delete */}
            <button
              onClick={(e) => { e.stopPropagation(); deleteConnection(conn.id) }}
              className="flex h-5 w-5 shrink-0 items-center justify-center rounded opacity-0 group-hover:opacity-100 transition-opacity"
              style={{ color: 'var(--color-muted-foreground)' }}
              onMouseEnter={(e) => e.currentTarget.style.color = 'var(--color-destructive)'}
              onMouseLeave={(e) => e.currentTarget.style.color = 'var(--color-muted-foreground)'}
            >
              <Trash2 size={11} />
            </button>
          </div>
        )
      })}
    </div>
  )
}
