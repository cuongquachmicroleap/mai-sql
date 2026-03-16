import { useState, useRef } from 'react'
import ReactDOM from 'react-dom'
import { CheckCircle2, XCircle, Loader2, Table2, Download, Copy } from 'lucide-react'
import type { QueryResult } from '@shared/types/query'

interface ResultsToolbarProps {
  result: QueryResult | null
  error: string | null
  isExecuting: boolean
}

function exportCSV(result: QueryResult) {
  const headers = result.columns.map((c) => c.name).join(',')
  const rows = result.rows.map((row) =>
    result.columns.map((c) => {
      const v = (row as Record<string, unknown>)[c.name]
      if (v === null || v === undefined) return ''
      const s = String(v)
      return s.includes(',') || s.includes('"') || s.includes('\n')
        ? `"${s.replace(/"/g, '""')}"`
        : s
    }).join(',')
  ).join('\n')
  const csv = headers + '\n' + rows
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'query-result.csv'
  a.click()
  URL.revokeObjectURL(url)
}

function exportJSON(result: QueryResult) {
  const json = JSON.stringify(result.rows, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'query-result.json'
  a.click()
  URL.revokeObjectURL(url)
}

function copyAsCSV(result: QueryResult) {
  const headers = result.columns.map((c) => c.name).join(',')
  const rows = result.rows.map((row) =>
    result.columns.map((c) => {
      const v = (row as Record<string, unknown>)[c.name]
      if (v === null || v === undefined) return ''
      const s = String(v)
      return s.includes(',') || s.includes('"') || s.includes('\n')
        ? `"${s.replace(/"/g, '""')}"`
        : s
    }).join(',')
  ).join('\n')
  const csv = headers + '\n' + rows
  navigator.clipboard.writeText(csv).catch(() => {})
}

const toolbarBtnStyle = (hovered: boolean): React.CSSProperties => ({
  height: 22,
  padding: '0 8px',
  borderRadius: 4,
  fontSize: 11,
  border: 'none',
  cursor: 'pointer',
  background: hovered ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.06)',
  color: hovered ? '#ECECEC' : '#8B8B8B',
  transition: 'background 0.12s, color 0.12s',
  display: 'flex',
  alignItems: 'center',
  gap: 4,
})

export function ResultsToolbar({ result, error, isExecuting }: ResultsToolbarProps) {
  const [exportHovered, setExportHovered] = useState(false)
  const [copyHovered, setCopyHovered] = useState(false)
  const [exportOpen, setExportOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const exportBtnRef = useRef<HTMLButtonElement>(null)

  const handleCopy = () => {
    if (!result) return
    copyAsCSV(result)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

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

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Export and Copy buttons — only when there are results */}
      {result && !isExecuting && (
        <div className="flex items-center gap-1.5" style={{ position: 'relative' }}>
          {/* Copy as CSV button */}
          <button
            onClick={handleCopy}
            onMouseEnter={() => setCopyHovered(true)}
            onMouseLeave={() => setCopyHovered(false)}
            title="Copy results as CSV"
            style={toolbarBtnStyle(copyHovered)}
          >
            <Copy size={10} />
            <span>{copied ? 'Copied!' : 'Copy CSV'}</span>
          </button>

          {/* Export dropdown */}
          <div style={{ position: 'relative' }}>
            <button
              ref={exportBtnRef}
              onClick={() => setExportOpen((o) => !o)}
              onMouseEnter={() => setExportHovered(true)}
              onMouseLeave={() => setExportHovered(false)}
              title="Export results"
              style={toolbarBtnStyle(exportHovered)}
            >
              <Download size={10} />
              <span>Export</span>
            </button>

            {exportOpen && (() => {
              const rect = exportBtnRef.current?.getBoundingClientRect()
              return ReactDOM.createPortal(
                <>
                  {/* Backdrop to close */}
                  <div
                    style={{ position: 'fixed', inset: 0, zIndex: 999 }}
                    onClick={() => setExportOpen(false)}
                  />
                  <div
                    style={{
                      position: 'fixed',
                      right: rect ? window.innerWidth - rect.right : 0,
                      top: rect ? rect.bottom + 4 : 0,
                      zIndex: 1000,
                      background: '#222227',
                      border: '1px solid rgba(255,255,255,0.12)',
                      borderRadius: 7,
                      padding: 4,
                      boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                      minWidth: 140,
                    }}
                  >
                    {[
                      { label: 'Export as CSV', action: () => { exportCSV(result); setExportOpen(false) } },
                      { label: 'Export as JSON', action: () => { exportJSON(result); setExportOpen(false) } },
                    ].map((item) => (
                      <button
                        key={item.label}
                        onClick={item.action}
                        className="flex w-full items-center"
                        style={{
                          height: 28,
                          padding: '0 10px',
                          fontSize: 12,
                          color: '#ECECEC',
                          background: 'transparent',
                          border: 'none',
                          borderRadius: 4,
                          cursor: 'pointer',
                          textAlign: 'left',
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)' }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </>,
                document.body
              )
            })()}
          </div>
        </div>
      )}
    </div>
  )
}
