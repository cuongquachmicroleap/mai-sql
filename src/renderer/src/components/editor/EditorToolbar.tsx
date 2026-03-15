import { useState } from 'react'
import { Play, Square, AlignLeft, Zap } from 'lucide-react'
import { format } from 'sql-formatter'
import { useEditorStore } from '../../stores/editor-store'
import { useConnectionStore } from '../../stores/connection-store'

interface EditorToolbarProps { tabId: string }

const ROW_LIMIT_OPTIONS: { label: string; value: number | null }[] = [
  { label: '100', value: 100 },
  { label: '500', value: 500 },
  { label: '1000', value: 1000 },
  { label: 'All', value: null },
]

function applyRowLimit(sql: string, limit: number | null): string {
  if (limit === null) return sql
  const trimmed = sql.trim()
  // Only add LIMIT to SELECT statements that don't already have one
  if (!trimmed.toUpperCase().startsWith('SELECT')) return sql
  if (/\bLIMIT\b/i.test(trimmed)) return sql
  return `${trimmed}\nLIMIT ${limit}`
}

const toolbarBtnStyle = (hovered: boolean): React.CSSProperties => ({
  height: 28,
  padding: '0 10px',
  borderRadius: 5,
  fontSize: 12,
  border: 'none',
  cursor: 'pointer',
  background: hovered ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.06)',
  color: hovered ? '#ECECEC' : '#8B8B8B',
  transition: 'background 0.12s, color 0.12s',
  display: 'flex',
  alignItems: 'center',
  gap: 5,
})

export function EditorToolbar({ tabId }: EditorToolbarProps) {
  const { tabs, executeQuery, updateTabContent, setRowLimit } = useEditorStore()
  const { activeConnectionId, connections } = useConnectionStore()
  const tab = tabs.find((t) => t.id === tabId)
  const [runHovered, setRunHovered] = useState(false)
  const [formatHovered, setFormatHovered] = useState(false)
  const [explainHovered, setExplainHovered] = useState(false)

  if (!tab) return null

  const canExecute = !!activeConnectionId && !!tab.content.trim() && !tab.isExecuting
  const activeConn = connections.find((c) => c.id === activeConnectionId)

  const runBgDefault = tab.isExecuting ? '#F87171' : '#5B8AF0'
  const runBgHover   = tab.isExecuting ? '#ef5350' : '#4A7AE0'

  const handleRun = () => {
    if (!activeConnectionId) return
    // If there's selected text, execute only that
    const sqlToRun = tab.selectedText.trim() || tab.content
    const sqlWithLimit = applyRowLimit(sqlToRun, tab.rowLimit)
    executeQuery(tabId, activeConnectionId, sqlWithLimit)
  }

  const handleFormat = () => {
    try {
      const formatted = format(tab.content, { language: 'postgresql', tabWidth: 2, keywordCase: 'upper' })
      updateTabContent(tabId, formatted)
    } catch {
      // If formatting fails (e.g. invalid SQL), do nothing
    }
  }

  const handleExplain = () => {
    if (!activeConnectionId || !tab.content.trim()) return
    const sqlToRun = tab.selectedText.trim() || tab.content
    const explainSql = `EXPLAIN ${sqlToRun.trim()}`
    executeQuery(tabId, activeConnectionId, explainSql)
  }

  const selChars = tab.selectedText.length

  return (
    <div
      className="flex items-center gap-2 px-3 shrink-0"
      style={{
        height: 38,
        borderBottom: '1px solid rgba(255,255,255,0.07)',
        background: '#1C1C20',
      }}
    >
      {/* Run / Stop button */}
      <button
        disabled={!canExecute && !tab.isExecuting}
        onClick={tab.isExecuting ? () => {} : handleRun}
        onMouseEnter={() => setRunHovered(true)}
        onMouseLeave={() => setRunHovered(false)}
        className="flex items-center gap-1.5"
        style={{
          fontSize: 12,
          fontWeight: 500,
          background: runHovered && (canExecute || tab.isExecuting) ? runBgHover : runBgDefault,
          color: '#ffffff',
          borderRadius: 6,
          padding: '0 10px',
          height: 26,
          border: 'none',
          cursor: canExecute || tab.isExecuting ? 'pointer' : 'default',
          opacity: canExecute || tab.isExecuting ? 1 : 0.35,
          transition: 'background 0.15s',
        }}
      >
        {tab.isExecuting ? <Square size={10} /> : <Play size={10} />}
        <span>{tab.isExecuting ? 'Stop' : 'Run'}</span>
        <span style={{ opacity: 0.55, marginLeft: 2, fontSize: 10 }}>⌘↵</span>
      </button>

      {/* Format button */}
      <button
        onClick={handleFormat}
        onMouseEnter={() => setFormatHovered(true)}
        onMouseLeave={() => setFormatHovered(false)}
        title="Format SQL (sql-formatter)"
        style={toolbarBtnStyle(formatHovered)}
      >
        <AlignLeft size={11} />
        <span>Format</span>
      </button>

      {/* Explain button */}
      <button
        disabled={!canExecute}
        onClick={handleExplain}
        onMouseEnter={() => setExplainHovered(true)}
        onMouseLeave={() => setExplainHovered(false)}
        title="Prepend EXPLAIN and execute"
        style={{
          ...toolbarBtnStyle(explainHovered),
          opacity: canExecute ? 1 : 0.35,
          cursor: canExecute ? 'pointer' : 'default',
        }}
      >
        <Zap size={11} />
        <span>Explain</span>
      </button>

      {/* Row limit selector */}
      <div className="flex items-center gap-1" style={{ color: '#555560', fontSize: 11 }}>
        <span>Limit</span>
        <select
          value={tab.rowLimit === null ? 'null' : String(tab.rowLimit)}
          onChange={(e) => {
            const v = e.target.value
            setRowLimit(tabId, v === 'null' ? null : Number(v))
          }}
          style={{
            height: 24,
            padding: '0 4px',
            borderRadius: 5,
            fontSize: 11,
            border: '1px solid rgba(255,255,255,0.1)',
            background: '#222227',
            color: '#ECECEC',
            cursor: 'pointer',
            outline: 'none',
          }}
        >
          {ROW_LIMIT_OPTIONS.map((opt) => (
            <option key={opt.label} value={opt.value === null ? 'null' : String(opt.value)}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Selected text indicator */}
      {selChars > 0 && (
        <span style={{ fontSize: 11, color: '#5B8AF0', marginLeft: 2 }}>
          {selChars} chars selected
        </span>
      )}

      <div style={{ width: 1, height: 16, background: 'rgba(255,255,255,0.08)', margin: '0 4px' }} />

      {/* Active connection chip */}
      {activeConn ? (
        <div
          className="flex items-center gap-1.5"
          style={{
            fontSize: 12,
            background: '#222227',
            color: '#ECECEC',
            borderRadius: 6,
            padding: '0 8px',
            height: 24,
          }}
        >
          <span
            className="h-1.5 w-1.5 rounded-full shrink-0"
            style={{ background: '#34D399' }}
          />
          <span style={{ color: '#ECECEC' }}>{activeConn.name}</span>
          <span style={{ color: '#555560' }}>{activeConn.type}</span>
        </div>
      ) : (
        <span style={{ fontSize: 12, color: '#555560' }}>
          No connection
        </span>
      )}
    </div>
  )
}
