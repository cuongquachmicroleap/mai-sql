import { useState } from 'react'
import { Play, Square } from 'lucide-react'
import { useEditorStore } from '../../stores/editor-store'
import { useConnectionStore } from '../../stores/connection-store'

interface EditorToolbarProps { tabId: string }

export function EditorToolbar({ tabId }: EditorToolbarProps) {
  const { tabs, executeQuery } = useEditorStore()
  const { activeConnectionId, connections } = useConnectionStore()
  const tab = tabs.find((t) => t.id === tabId)
  const [btnHovered, setBtnHovered] = useState(false)

  if (!tab) return null

  const canExecute = !!activeConnectionId && !!tab.content.trim() && !tab.isExecuting
  const activeConn = connections.find((c) => c.id === activeConnectionId)

  const runBgDefault = tab.isExecuting ? '#F87171' : '#5B8AF0'
  const runBgHover   = tab.isExecuting ? '#ef5350' : '#4A7AE0'

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
        onClick={() => executeQuery(tabId, activeConnectionId!, tab.content)}
        onMouseEnter={() => setBtnHovered(true)}
        onMouseLeave={() => setBtnHovered(false)}
        className="flex items-center gap-1.5"
        style={{
          fontSize: 12,
          fontWeight: 500,
          background: btnHovered && (canExecute || tab.isExecuting) ? runBgHover : runBgDefault,
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
