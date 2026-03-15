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
        background: '#0a0a0a',
        fontSize: 11,
      }}
    >
      <div className="flex items-center gap-1.5 font-medium" style={{ color: 'var(--color-muted-foreground)' }}>
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
        <div className="flex items-center gap-1.5 min-w-0" style={{ color: 'var(--color-destructive)' }}>
          <XCircle size={11} className="shrink-0" />
          <span className="truncate">{error}</span>
        </div>
      )}

      {result && !error && !isExecuting && (
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5" style={{ color: '#22c55e' }}>
            <CheckCircle2 size={11} />
            <span>{result.rowCount.toLocaleString()} rows</span>
          </div>
          <span style={{ color: 'var(--color-muted-foreground)' }}>{result.executionTimeMs}ms</span>
        </div>
      )}

      {!result && !error && !isExecuting && (
        <span style={{ color: 'var(--color-muted-foreground)' }}>Ready</span>
      )}
    </div>
  )
}
