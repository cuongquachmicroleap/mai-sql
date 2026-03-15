import { Play, Square } from 'lucide-react'
import { useEditorStore } from '../../stores/editor-store'
import { useConnectionStore } from '../../stores/connection-store'

interface EditorToolbarProps { tabId: string }

export function EditorToolbar({ tabId }: EditorToolbarProps) {
  const { tabs, executeQuery } = useEditorStore()
  const { activeConnectionId, connections } = useConnectionStore()
  const tab = tabs.find((t) => t.id === tabId)
  if (!tab) return null

  const canExecute = !!activeConnectionId && !!tab.content.trim() && !tab.isExecuting
  const activeConn = connections.find((c) => c.id === activeConnectionId)

  return (
    <div
      className="flex items-center gap-2 px-3 shrink-0"
      style={{
        height: 36,
        borderBottom: '1px solid var(--color-border)',
        background: 'var(--color-bg-elevated)',
      }}
    >
      {/* Run button */}
      <button
        disabled={!canExecute}
        onClick={() => executeQuery(tabId, activeConnectionId!, tab.content)}
        className="flex items-center gap-1.5 rounded px-2.5 py-1 font-medium transition-all disabled:opacity-40"
        style={{
          fontSize: 12,
          background: '#3B82F6',
          color: '#ffffff',
          opacity: canExecute ? 1 : 0.4,
        }}
        onMouseEnter={(e) => { if (canExecute) e.currentTarget.style.background = '#2563EB' }}
        onMouseLeave={(e) => { if (canExecute) e.currentTarget.style.background = '#3B82F6' }}
      >
        {tab.isExecuting ? <Square size={11} /> : <Play size={11} />}
        <span>{tab.isExecuting ? 'Stop' : 'Run'}</span>
        <span className="opacity-50 ml-0.5" style={{ fontSize: 10 }}>⌘↵</span>
      </button>

      <div className="h-4 w-px mx-1" style={{ background: 'var(--color-border)' }} />

      {/* Active connection chip */}
      {activeConn ? (
        <div
          className="flex items-center gap-1.5 rounded px-2 py-1"
          style={{
            fontSize: 12,
            background: 'var(--color-bg-subtle)',
            color: 'var(--color-text-primary)',
          }}
        >
          <span
            className="h-1.5 w-1.5 rounded-full shrink-0"
            style={{ background: '#22C55E' }}
          />
          <span>{activeConn.name}</span>
          <span style={{ color: 'var(--color-text-muted)' }}>{activeConn.type}</span>
        </div>
      ) : (
        <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
          No connection
        </span>
      )}
    </div>
  )
}
