import { useState, useCallback, useRef } from 'react'
import { useConnectionStore } from '../../stores/connection-store'
import { useEditorStore } from '../../stores/editor-store'
import { ConnectionList } from '../sidebar/ConnectionList'
import { ConnectionForm } from '../settings/ConnectionForm'
import type { SavedConnection } from '@shared/types/connection'
import { TabBar } from '../editor/TabBar'
import { QueryEditor } from '../editor/QueryEditor'
import { EditorToolbar } from '../editor/EditorToolbar'
import { ResultsGrid } from '../results/ResultsGrid'
import { ResultsToolbar } from '../results/ResultsToolbar'
import { ERDiagram } from '../er-diagram/ERDiagram'
import { BackupRestore } from '../backup/BackupRestore'
import { StatusBar } from './StatusBar'
import { Database, Settings, ChevronRight, Network, ArchiveRestore } from 'lucide-react'

type ActiveView = 'editor' | 'er-diagram' | 'backup'

const MIN_SIDEBAR = 160
const MAX_SIDEBAR = 480
const DEFAULT_SIDEBAR = 240
const MIN_RESULTS = 120
const MAX_RESULTS = 600
const DEFAULT_RESULTS = 240

export function MainLayout() {
  useConnectionStore()
  const { tabs, activeTabId } = useEditorStore()
  const activeTab = tabs.find((t) => t.id === activeTabId) ?? tabs[0]
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [sidebarWidth, setSidebarWidth] = useState(DEFAULT_SIDEBAR)
  const [resultsHeight, setResultsHeight] = useState(DEFAULT_RESULTS)
  const [activeView, setActiveView] = useState<ActiveView>('editor')
  const [editingConnection, setEditingConnection] = useState<SavedConnection | null>(null)

  // Sidebar resize
  const sidebarDragging = useRef(false)
  const handleSidebarDrag = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    sidebarDragging.current = true
    const startX = e.clientX
    const startW = sidebarWidth
    const onMove = (ev: MouseEvent) => {
      if (!sidebarDragging.current) return
      setSidebarWidth(Math.min(MAX_SIDEBAR, Math.max(MIN_SIDEBAR, startW + ev.clientX - startX)))
    }
    const onUp = () => {
      sidebarDragging.current = false
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
  }, [sidebarWidth])

  // Results panel resize
  const resultsDragging = useRef(false)
  const handleResultsDrag = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    resultsDragging.current = true
    const startY = e.clientY
    const startH = resultsHeight
    const onMove = (ev: MouseEvent) => {
      if (!resultsDragging.current) return
      setResultsHeight(Math.min(MAX_RESULTS, Math.max(MIN_RESULTS, startH - (ev.clientY - startY))))
    }
    const onUp = () => {
      resultsDragging.current = false
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
    document.body.style.cursor = 'row-resize'
    document.body.style.userSelect = 'none'
  }, [resultsHeight])

  return (
    <div
      className="flex flex-col h-screen overflow-hidden"
      style={{ background: '#0C0C0E', color: '#ECECEC' }}
    >
      {/* Custom titlebar drag region — sits above everything, draggable */}
      <div
        style={{
          height: 40,
          background: '#0C0C0E',
          flexShrink: 0,
          // @ts-ignore electron CSS
          WebkitAppRegion: 'drag',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <span style={{ fontSize: 12, color: '#555560', fontWeight: 500, letterSpacing: '0.02em', userSelect: 'none' }}>
          MAI SQL
        </span>
      </div>

      <div className="flex flex-1 overflow-hidden min-h-0">

        {/* Activity bar — 44px */}
        <div
          className="flex flex-col items-center gap-0.5 py-2 shrink-0"
          style={{
            width: 44,
            background: '#0C0C0E',
            borderRight: '1px solid rgba(255,255,255,0.07)',
          }}
        >
          <ActivityBtn
            icon={<Database size={17} />}
            active={!sidebarCollapsed && activeView === 'editor'}
            onClick={() => {
              if (!sidebarCollapsed && activeView === 'editor') {
                setSidebarCollapsed(true)
              } else {
                setSidebarCollapsed(false)
                setActiveView('editor')
              }
            }}
            title="Explorer"
          />
          <ActivityBtn
            icon={<Network size={17} />}
            active={activeView === 'er-diagram'}
            onClick={() => setActiveView((v) => v === 'er-diagram' ? 'editor' : 'er-diagram')}
            title="ER Diagram"
          />
          <ActivityBtn
            icon={<ArchiveRestore size={17} />}
            active={activeView === 'backup'}
            onClick={() => setActiveView((v) => v === 'backup' ? 'editor' : 'backup')}
            title="Backup & Restore"
          />
          <div className="flex-1" />
          <ActivityBtn icon={<Settings size={16} />} title="Settings" />
        </div>

        {/* Sidebar */}
        {!sidebarCollapsed && (
          <div
            className="flex flex-col shrink-0 overflow-hidden relative"
            style={{
              width: sidebarWidth,
              background: '#1C1C20',
              borderRight: '1px solid rgba(255,255,255,0.07)',
            }}
          >
            {/* Header */}
            <div
              className="flex items-center justify-between shrink-0"
              style={{
                height: 40,
                padding: '0 12px',
                borderBottom: '1px solid rgba(255,255,255,0.07)',
              }}
            >
              <span style={{
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: '#555560',
              }}>
                Explorer
              </span>
            </div>

            {/* New connection */}
            <div className="px-2 py-2 shrink-0" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
              <ConnectionForm />
              {editingConnection && (
                <ConnectionForm initialConnection={editingConnection} onClose={() => setEditingConnection(null)} />
              )}
            </div>

            {/* Connections + schema tree */}
            <div className="flex-1 overflow-y-auto min-h-0">
              <SectionLabel>Connections</SectionLabel>
              <ConnectionList onEdit={setEditingConnection} />
            </div>

            {/* Sidebar drag handle */}
            <div
              onMouseDown={handleSidebarDrag}
              className="absolute top-0 right-0 bottom-0"
              style={{ width: 4, cursor: 'col-resize' }}
              onMouseEnter={(e) => e.currentTarget.style.background = '#5B8AF0'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            />
          </div>
        )}

        {/* Collapsed sidebar — thin expand strip */}
        {sidebarCollapsed && (
          <button
            onClick={() => setSidebarCollapsed(false)}
            style={{
              width: 4,
              background: 'rgba(255,255,255,0.07)',
              cursor: 'col-resize',
              flexShrink: 0,
              border: 'none',
              padding: 0,
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = '#5B8AF0'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.07)'}
            title="Expand sidebar"
          >
            <ChevronRight size={8} style={{ color: 'transparent' }} />
          </button>
        )}

        {/* Main area */}
        <main className="flex flex-1 flex-col overflow-hidden min-w-0" style={{ background: '#131316' }}>
          {activeView === 'backup' ? (
            <BackupRestore />
          ) : activeView === 'er-diagram' ? (
            <ERDiagram />
          ) : (
            <>
              <TabBar />

              {activeTab ? (
                <div className="flex flex-1 flex-col overflow-hidden min-h-0">
                  <EditorToolbar tabId={activeTab.id} />

                  {/* Editor — takes remaining space */}
                  <div className="flex-1 overflow-hidden min-h-0">
                    <QueryEditor tabId={activeTab.id} />
                  </div>

                  {/* Results panel with drag-to-resize handle on top */}
                  <div
                    className="flex flex-col shrink-0 overflow-hidden"
                    style={{
                      height: resultsHeight,
                      borderTop: '1px solid rgba(255,255,255,0.07)',
                    }}
                  >
                    {/* Drag handle — 4px */}
                    <div
                      onMouseDown={handleResultsDrag}
                      style={{
                        height: 4,
                        cursor: 'row-resize',
                        flexShrink: 0,
                        background: 'transparent',
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = '#5B8AF0'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    />

                    <ResultsToolbar
                      result={activeTab.result}
                      error={activeTab.error}
                      isExecuting={activeTab.isExecuting}
                    />
                    <div className="flex-1 overflow-hidden min-h-0">
                      {activeTab.result ? (
                        <ResultsGrid result={activeTab.result} />
                      ) : (
                        <div
                          className="flex h-full items-center justify-center"
                          style={{ color: '#555560', fontSize: 13 }}
                        >
                          {activeTab.error ? null : 'Run a query to see results'}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-1 items-center justify-center" style={{ color: '#555560' }}>
                  <div className="text-center" style={{ gap: 12, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <Database size={40} style={{ opacity: 0.12, color: '#8B8B8B' }} />
                    <p style={{ fontSize: 14, color: '#8B8B8B', margin: 0 }}>Connect to a database to get started</p>
                    <p style={{ fontSize: 12, color: '#555560', margin: 0 }}>Select a connection in the sidebar or create a new one</p>
                  </div>
                </div>
              )}
            </>
          )}
        </main>
      </div>

      <StatusBar result={activeTab?.result} />
    </div>
  )
}

function ActivityBtn({
  icon, active, onClick, title
}: {
  icon: React.ReactNode
  active?: boolean
  onClick?: () => void
  title?: string
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className="flex items-center justify-center"
      style={{
        width: 36,
        height: 36,
        borderRadius: 6,
        color: active ? '#ECECEC' : '#555560',
        background: active ? 'rgba(91,138,240,0.12)' : 'transparent',
        borderLeft: active ? '2px solid #5B8AF0' : '2px solid transparent',
        border: 'none',
        cursor: 'pointer',
        transition: 'color 0.15s, background 0.15s',
      }}
      onMouseEnter={(e) => {
        if (!active) {
          e.currentTarget.style.color = '#8B8B8B'
          e.currentTarget.style.background = 'rgba(255,255,255,0.05)'
        }
      }}
      onMouseLeave={(e) => {
        if (!active) {
          e.currentTarget.style.color = '#555560'
          e.currentTarget.style.background = 'transparent'
        }
      }}
    >
      {icon}
    </button>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      padding: '10px 12px 4px',
      fontSize: 10,
      fontWeight: 600,
      letterSpacing: '0.09em',
      textTransform: 'uppercase',
      color: '#555560',
    }}>
      {children}
    </div>
  )
}
