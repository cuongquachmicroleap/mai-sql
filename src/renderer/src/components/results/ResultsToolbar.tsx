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
        height: 32,
        borderBottom: '1px solid var(--color-border)',
        background: 'var(--color-bg-elevated)',
        fontSize: 11,
        fontFamily: 'var(--font-sans)',
      }}
    >
      <div className="flex items-center gap-1.5 font-medium" style={{ color: 'var(--color-text-muted)' }}>
        <Table2 size={12} />
        <span>Results</span>
      </div>

      <div className="h-3 w-px" style={{ background: 'var(--color-border)' }} />

      {isExecuting && (
        <div className="flex items-center gap-1.5" style={{ color: 'var(--color-primary)' }}>
          <Loader2 size={11} className="animate-spin" />
          <span>Executing...</span>
        </div>
      )}

      {error && !isExecuting && (
        <div className="flex items-center gap-1.5 min-w-0">
          {/* Status pill: error */}
          <span
            className="flex items-center gap-1 rounded-full px-1.5 py-0.5"
            style={{ background: 'rgba(239,68,68,0.15)', color: '#EF4444' }}
          >
            <XCircle size={10} className="shrink-0" />
            <span>Error</span>
          </span>
          <span className="truncate" style={{ color: 'var(--color-text-secondary)' }}>{error}</span>
        </div>
      )}

      {result && !error && !isExecuting && (
        <div className="flex items-center gap-3">
          {/* Status pill: success */}
          <span
            className="flex items-center gap-1 rounded-full px-1.5 py-0.5"
            style={{ background: 'rgba(34,197,94,0.15)', color: '#22C55E' }}
          >
            <CheckCircle2 size={10} />
            <span>OK</span>
          </span>
          <span style={{ color: 'var(--color-text-secondary)' }}>
            {result.rowCount.toLocaleString()} rows
          </span>
          <span style={{ color: 'var(--color-text-muted)' }}>{result.executionTimeMs}ms</span>
        </div>
      )}

      {!result && !error && !isExecuting && (
        <span style={{ color: 'var(--color-text-muted)' }}>Ready</span>
      )}
    </div>
  )
}
