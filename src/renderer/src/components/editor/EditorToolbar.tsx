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
      className="flex items-center gap-2 px-3"
      style={{
        height: 38,
        borderBottom: '1px solid var(--color-border)',
        background: '#0a0a0a',
      }}
    >
      {/* Run button */}
      <button
        disabled={!canExecute}
        onClick={() => executeQuery(tabId, activeConnectionId!, tab.content)}
        className="flex items-center gap-1.5 rounded px-2.5 py-1 text-xs font-medium transition-all disabled:opacity-40"
        style={{
          background: canExecute ? 'var(--color-primary)' : 'var(--color-secondary)',
          color: canExecute ? 'var(--color-primary-foreground)' : 'var(--color-muted-foreground)',
        }}
      >
        {tab.isExecuting ? <Square size={11} /> : <Play size={11} />}
        <span>{tab.isExecuting ? 'Stop' : 'Run'}</span>
        <span className="opacity-50 ml-0.5" style={{ fontSize: 10 }}>⌘↵</span>
      </button>

      <div className="h-4 w-px mx-1" style={{ background: 'var(--color-border)' }} />

      {/* Active connection chip */}
      {activeConn ? (
        <div
          className="flex items-center gap-1.5 rounded px-2 py-1 text-xs"
          style={{ background: 'var(--color-secondary)', color: 'var(--color-foreground)' }}
        >
          <span
            className="h-1.5 w-1.5 rounded-full shrink-0"
            style={{ background: '#22c55e' }}
          />
          <span>{activeConn.name}</span>
          <span style={{ color: 'var(--color-muted-foreground)' }}>{activeConn.type}</span>
        </div>
      ) : (
        <span className="text-xs" style={{ color: 'var(--color-muted-foreground)' }}>
          No connection
        </span>
      )}
    </div>
  )
}
