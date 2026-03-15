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
import { Database, Settings, ChevronLeft, ChevronRight, Network, ArchiveRestore } from 'lucide-react'

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
      style={{ background: 'var(--color-bg-base)', color: 'var(--color-text-primary)' }}
    >
      <div className="flex flex-1 overflow-hidden min-h-0">

        {/* Activity bar */}
        <div
          className="flex flex-col items-center gap-0.5 py-2 shrink-0"
          style={{ width: 44, background: 'var(--color-bg-base)', borderRight: '1px solid var(--color-border)' }}
        >
          <ActivityBtn
            icon={<Database size={18} />}
            active={!sidebarCollapsed}
            onClick={() => { setSidebarCollapsed((v) => !v); setActiveView('editor') }}
            title="Explorer"
          />
          <ActivityBtn
            icon={<Network size={18} />}
            active={activeView === 'er-diagram'}
            onClick={() => setActiveView((v) => v === 'er-diagram' ? 'editor' : 'er-diagram')}
            title="ER Diagram"
          />
          <ActivityBtn
            icon={<ArchiveRestore size={18} />}
            active={activeView === 'backup'}
            onClick={() => setActiveView((v) => v === 'backup' ? 'editor' : 'backup')}
            title="Backup & Restore"
          />
          <div className="flex-1" />
          <ActivityBtn icon={<Settings size={17} />} title="Settings" />
        </div>

        {/* Sidebar */}
        {!sidebarCollapsed && (
          <div
            className="flex flex-col shrink-0 overflow-hidden relative"
            style={{ width: sidebarWidth, background: 'var(--color-bg-overlay)', borderRight: '1px solid var(--color-border)' }}
          >
            {/* Header */}
            <div
              className="flex items-center justify-between shrink-0"
              style={{ height: 40, padding: '0 12px', borderBottom: '1px solid var(--color-border)' }}
            >
              <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--color-text-muted)' }}>
                Explorer
              </span>
              <button
                onClick={() => setSidebarCollapsed(true)}
                style={{ color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', borderRadius: 4, padding: 2 }}
                onMouseEnter={(e) => e.currentTarget.style.color = 'var(--color-text-primary)'}
                onMouseLeave={(e) => e.currentTarget.style.color = 'var(--color-text-muted)'}
              >
                <ChevronLeft size={14} />
              </button>
            </div>

            {/* New connection */}
            <div className="px-2 py-2 shrink-0" style={{ borderBottom: '1px solid var(--color-border)' }}>
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
              onMouseEnter={(e) => e.currentTarget.style.background = 'var(--color-primary)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            />
          </div>
        )}

        {/* Collapsed sidebar strip */}
        {sidebarCollapsed && (
          <button
            onClick={() => setSidebarCollapsed(false)}
            style={{ width: 4, background: 'var(--color-border)', cursor: 'col-resize', flexShrink: 0 }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'var(--color-primary)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'var(--color-border)'}
            title="Expand sidebar"
          >
            <ChevronRight size={8} style={{ color: 'transparent' }} />
          </button>
        )}

        {/* Main area */}
        <main className="flex flex-1 flex-col overflow-hidden min-w-0" style={{ background: 'var(--color-bg-surface)' }}>
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
                    style={{ height: resultsHeight, borderTop: '1px solid var(--color-border)' }}
                  >
                    {/* Drag handle */}
                    <div
                      onMouseDown={handleResultsDrag}
                      style={{
                        height: 4,
                        cursor: 'row-resize',
                        flexShrink: 0,
                        background: 'transparent',
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'var(--color-primary)'}
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
                          style={{ color: 'var(--color-text-muted)', fontSize: 13 }}
                        >
                          {activeTab.error ? null : 'Run a query to see results'}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-1 items-center justify-center" style={{ color: 'var(--color-text-muted)' }}>
                  <div className="text-center" style={{ gap: 8, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <Database size={36} style={{ opacity: 0.15 }} />
                    <p style={{ fontSize: 14 }}>Connect to a database to get started</p>
                    <p style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>Select a connection in the sidebar or create a new one</p>
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
      className="flex items-center justify-center rounded transition-colors"
      style={{
        width: 36, height: 36,
        color: active ? 'var(--color-text-primary)' : 'var(--color-text-muted)',
        borderLeft: active ? '2px solid var(--color-primary)' : '2px solid transparent',
      }}
      onMouseEnter={(e) => { if (!active) e.currentTarget.style.color = 'var(--color-text-primary)' }}
      onMouseLeave={(e) => { if (!active) e.currentTarget.style.color = 'var(--color-text-muted)' }}
    >
      {icon}
    </button>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ padding: '10px 12px 4px', fontSize: 11, fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--color-text-muted)' }}>
      {children}
    </div>
  )
}
