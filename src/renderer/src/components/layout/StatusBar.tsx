import { useConnectionStore } from '../../stores/connection-store'
import type { QueryResult } from '@shared/types/query'

interface StatusBarProps {
  result?: QueryResult | null
}

export function StatusBar({ result }: StatusBarProps) {
  const { activeConnectionId, connections } = useConnectionStore()
  const activeConn = connections.find((c) => c.id === activeConnectionId)

  return (
    <div
      className="flex items-center justify-between px-3 shrink-0 select-none"
      style={{
        height: 24,
        background: 'var(--color-bg-base)',
        borderTop: '1px solid var(--color-border)',
        fontSize: 11,
        color: 'var(--color-text-muted)',
      }}
    >
      {/* Left: connection info */}
      <div className="flex items-center gap-1.5">
        {activeConn ? (
          <>
            <span
              className="h-1.5 w-1.5 rounded-full shrink-0"
              style={{ background: 'var(--color-success)' }}
            />
            <span style={{ color: 'var(--color-text-secondary)' }}>
              {activeConn.name}
            </span>
            <span style={{ color: 'var(--color-text-muted)' }}>·</span>
            <span style={{ color: 'var(--color-text-muted)' }}>
              {activeConn.database}@{activeConn.host}
            </span>
          </>
        ) : (
          <>
            <span
              className="h-1.5 w-1.5 rounded-full shrink-0"
              style={{ background: 'var(--color-text-muted)' }}
            />
            <span>No connection</span>
          </>
        )}
      </div>

      {/* Right: row count + execution time */}
      {result && (
        <div className="flex items-center gap-2">
          <span>{result.rowCount.toLocaleString()} rows</span>
          <span style={{ color: 'var(--color-border)' }}>·</span>
          <span>{result.executionTimeMs}ms</span>
        </div>
      )}
    </div>
  )
}
