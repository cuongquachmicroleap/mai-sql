import type { QueryResult } from '@shared/types/query'

interface ResultsToolbarProps {
  result: QueryResult | null
  error: string | null
  isExecuting: boolean
}

export function ResultsToolbar({ result, error, isExecuting }: ResultsToolbarProps) {
  if (isExecuting) {
    return (
      <div className="flex h-8 items-center border-b border-border px-3 text-xs text-muted-foreground">
        <span className="animate-pulse">Executing query...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex h-8 items-center border-b border-border bg-destructive/10 px-3 text-xs text-destructive">
        <span className="font-medium mr-1">Error:</span> {error}
      </div>
    )
  }

  if (!result) return <div className="h-8 border-b border-border" />

  return (
    <div className="flex h-8 items-center gap-4 border-b border-border px-3 text-xs text-muted-foreground">
      <span>{result.rowCount.toLocaleString()} rows</span>
      <span>{result.executionTimeMs}ms</span>
      {result.affectedRows != null && <span>{result.affectedRows} rows affected</span>}
    </div>
  )
}
