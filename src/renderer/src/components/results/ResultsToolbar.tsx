import { CheckCircle2, XCircle, Loader2, Table2 } from 'lucide-react'
import type { QueryResult } from '@shared/types/query'

interface ResultsToolbarProps {
  result: QueryResult | null
  error: string | null
  isExecuting: boolean
}

export function ResultsToolbar({ result, error, isExecuting }: ResultsToolbarProps) {
  return (
    <div
      className="flex items-center gap-3 px-3 shrink-0"
      style={{
        height: 30,
        borderBottom: '1px solid rgba(255,255,255,0.07)',
        background: '#1C1C20',
        fontSize: 11,
      }}
    >
      <div className="flex items-center gap-1.5" style={{ color: '#555560', fontWeight: 500 }}>
        <Table2 size={12} />
        <span>Results</span>
      </div>

      <div style={{ width: 1, height: 12, background: 'rgba(255,255,255,0.08)' }} />

      {isExecuting && (
        <div className="flex items-center gap-1.5" style={{ color: '#5B8AF0' }}>
          <Loader2 size={11} className="animate-spin" />
          <span>Executing...</span>
        </div>
      )}

      {error && !isExecuting && (
        <div className="flex items-center gap-1.5 min-w-0">
          {/* Status pill: error */}
          <span
            className="flex items-center gap-1 rounded-full"
            style={{
              background: 'rgba(248,113,113,0.15)',
              color: '#F87171',
              padding: '1px 6px',
            }}
          >
            <XCircle size={10} className="shrink-0" />
            <span>Error</span>
          </span>
          <span className="truncate" style={{ color: '#8B8B8B' }}>{error}</span>
        </div>
      )}

      {result && !error && !isExecuting && (
        <div className="flex items-center gap-3">
          {/* Status pill: success */}
          <span
            className="flex items-center gap-1 rounded-full"
            style={{
              background: 'rgba(52,211,153,0.15)',
              color: '#34D399',
              padding: '1px 6px',
            }}
          >
            <CheckCircle2 size={10} />
            <span>OK</span>
          </span>
          <span style={{ color: '#8B8B8B' }}>
            {result.rowCount.toLocaleString()} rows
          </span>
          <span style={{ color: '#555560' }}>{result.executionTimeMs}ms</span>
        </div>
      )}

      {!result && !error && !isExecuting && (
        <span style={{ color: '#555560' }}>Ready</span>
      )}
    </div>
  )
}
