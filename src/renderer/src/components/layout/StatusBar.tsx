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
        height: 22,
        background: '#0C0C0E',
        borderTop: '1px solid rgba(255,255,255,0.07)',
        fontSize: 11,
        color: '#555560',
      }}
    >
      {/* Left: connection info */}
      <div className="flex items-center gap-1.5">
        {activeConn ? (
          <>
            <span
              className="rounded-full shrink-0"
              style={{ width: 6, height: 6, background: '#34D399', display: 'inline-block' }}
            />
            <span style={{ color: '#8B8B8B' }}>
              {activeConn.name}
            </span>
            <span style={{ color: '#555560' }}>·</span>
            <span style={{ color: '#555560' }}>
              {activeConn.database}@{activeConn.host}
            </span>
          </>
        ) : (
          <>
            <span
              className="rounded-full shrink-0"
              style={{ width: 6, height: 6, background: '#3A3A45', display: 'inline-block' }}
            />
            <span>No connection</span>
          </>
        )}
      </div>

      {/* Right: row count + execution time */}
      {result && (
        <div className="flex items-center gap-2">
          <span>{result.rowCount.toLocaleString()} rows</span>
          <span style={{ color: '#3A3A45' }}>·</span>
          <span>{result.executionTimeMs}ms</span>
        </div>
      )}
    </div>
  )
}
