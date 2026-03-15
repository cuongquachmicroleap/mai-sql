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

const MIN_SIDEBAR_WIDTH = 180
const MAX_SIDEBAR_WIDTH = 420
const DEFAULT_SIDEBAR_WIDTH = 240

export function MainLayout() {
  useConnectionStore()
  const { tabs, activeTabId } = useEditorStore()
  const activeTab = tabs.find((t) => t.id === activeTabId) ?? tabs[0]
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [sidebarWidth, setSidebarWidth] = useState(DEFAULT_SIDEBAR_WIDTH)
  const [resultsHeight] = useState(260)
  const [activeView, setActiveView] = useState<ActiveView>('editor')
  const [editingConnection, setEditingConnection] = useState<SavedConnection | null>(null)

  const isDragging = useRef(false)
  const dragStartX = useRef(0)
  const dragStartWidth = useRef(DEFAULT_SIDEBAR_WIDTH)

  const handleDragMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    isDragging.current = true
    dragStartX.current = e.clientX
    dragStartWidth.current = sidebarWidth

    const onMouseMove = (ev: MouseEvent) => {
      if (!isDragging.current) return
      const delta = ev.clientX - dragStartX.current
      const newWidth = Math.min(MAX_SIDEBAR_WIDTH, Math.max(MIN_SIDEBAR_WIDTH, dragStartWidth.current + delta))
      setSidebarWidth(newWidth)
    }

    const onMouseUp = () => {
      isDragging.current = false
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup', onMouseUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }

    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
  }, [sidebarWidth])

  return (
    <div
      className="flex flex-col h-screen overflow-hidden"
      style={{ background: 'var(--color-bg-base)', color: 'var(--color-text-primary)' }}
    >
      {/* Top area: activity bar + sidebar + main */}
      <div className="flex flex-1 overflow-hidden">

        {/* Activity bar (far left, icon strip) */}
        <div
          className="flex flex-col items-center gap-1 py-2 shrink-0"
          style={{
            width: 40,
            background: 'var(--color-bg-base)',
            borderRight: '1px solid var(--color-border)',
          }}
        >
          <button
            onClick={() => { setSidebarCollapsed((v) => !v); setActiveView('editor') }}
            className="flex h-9 w-9 items-center justify-center rounded transition-colors"
            style={{
              color: (!sidebarCollapsed || activeView === 'editor') ? 'var(--color-primary)' : 'var(--color-text-muted)',
            }}
            onMouseEnter={(e) => { if (sidebarCollapsed) e.currentTarget.style.color = 'var(--color-text-primary)' }}
            onMouseLeave={(e) => { if (sidebarCollapsed) e.currentTarget.style.color = 'var(--color-text-muted)' }}
            title="Toggle sidebar"
          >
            <Database size={18} />
          </button>
          <button
            onClick={() => setActiveView((v) => v === 'er-diagram' ? 'editor' : 'er-diagram')}
            className="flex h-9 w-9 items-center justify-center rounded transition-colors"
            style={{ color: activeView === 'er-diagram' ? 'var(--color-primary)' : 'var(--color-text-muted)' }}
            onMouseEnter={(e) => { if (activeView !== 'er-diagram') e.currentTarget.style.color = 'var(--color-text-primary)' }}
            onMouseLeave={(e) => { if (activeView !== 'er-diagram') e.currentTarget.style.color = 'var(--color-text-muted)' }}
            title="ER Diagram"
          >
            <Network size={18} />
          </button>
          <button
            onClick={() => setActiveView((v) => v === 'backup' ? 'editor' : 'backup')}
            className="flex h-9 w-9 items-center justify-center rounded transition-colors"
            style={{ color: activeView === 'backup' ? 'var(--color-primary)' : 'var(--color-text-muted)' }}
            onMouseEnter={(e) => { if (activeView !== 'backup') e.currentTarget.style.color = 'var(--color-text-primary)' }}
            onMouseLeave={(e) => { if (activeView !== 'backup') e.currentTarget.style.color = 'var(--color-text-muted)' }}
            title="Backup & Restore"
          >
            <ArchiveRestore size={18} />
          </button>
          <div className="flex-1" />
          <button
            className="flex h-9 w-9 items-center justify-center rounded transition-colors mb-1"
            style={{ color: 'var(--color-text-muted)' }}
            onMouseEnter={(e) => e.currentTarget.style.color = 'var(--color-text-primary)'}
            onMouseLeave={(e) => e.currentTarget.style.color = 'var(--color-text-muted)'}
            title="Settings"
          >
            <Settings size={18} />
          </button>
        </div>

        {/* Sidebar */}
        {!sidebarCollapsed && (
          <div
            className="flex flex-col shrink-0 overflow-hidden relative"
            style={{ width: sidebarWidth, background: 'var(--color-bg-overlay)', borderRight: '1px solid var(--color-border)' }}
          >
            {/* Sidebar header */}
            <div
              className="flex items-center justify-between px-3 py-2 shrink-0"
              style={{ borderBottom: '1px solid var(--color-border)', minHeight: 40 }}
            >
              <span
                className="font-semibold tracking-widest uppercase"
                style={{ color: 'var(--color-text-muted)', fontSize: 10, letterSpacing: '0.1em' }}
              >
                Explorer
              </span>
              <button
                onClick={() => setSidebarCollapsed(true)}
                className="flex h-5 w-5 items-center justify-center rounded transition-colors"
                style={{ color: 'var(--color-text-muted)' }}
                onMouseEnter={(e) => e.currentTarget.style.color = 'var(--color-text-primary)'}
                onMouseLeave={(e) => e.currentTarget.style.color = 'var(--color-text-muted)'}
              >
                <ChevronLeft size={13} />
              </button>
            </div>

            {/* New connection button */}
            <div className="px-2 py-2 shrink-0" style={{ borderBottom: '1px solid var(--color-border)' }}>
              <ConnectionForm />
              {editingConnection && (
                <ConnectionForm
                  initialConnection={editingConnection}
                  onClose={() => setEditingConnection(null)}
                />
              )}
            </div>

            {/* Connections section */}
            <div className="flex-1 overflow-y-auto">
              <SectionHeader label="Connections" />
              <ConnectionList onEdit={setEditingConnection} />
            </div>

            {/* Drag handle */}
            <div
              onMouseDown={handleDragMouseDown}
              className="absolute top-0 right-0 bottom-0 w-1 cursor-col-resize transition-colors"
              style={{ background: 'transparent' }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'var(--color-primary)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              title="Drag to resize"
            />
          </div>
        )}

        {/* Collapsed sidebar toggle */}
        {sidebarCollapsed && (
          <button
            onClick={() => setSidebarCollapsed(false)}
            className="flex items-center justify-center w-4 shrink-0 transition-all"
            style={{ background: 'var(--color-border)', cursor: 'col-resize' }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'var(--color-primary)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'var(--color-border)'}
            title="Expand sidebar"
          >
            <ChevronRight size={10} style={{ color: 'var(--color-text-muted)' }} />
          </button>
        )}

        {/* Main editor area */}
        <main className="flex flex-1 flex-col overflow-hidden" style={{ background: 'var(--color-bg-surface)' }}>
          {activeView === 'backup' ? (
            <BackupRestore />
          ) : activeView === 'er-diagram' ? (
            <ERDiagram />
          ) : (
            <>
              {/* Tab bar */}
              <TabBar />

              {activeTab ? (
                <div className="flex flex-1 flex-col overflow-hidden">
                  {/* Toolbar */}
                  <EditorToolbar tabId={activeTab.id} />

                  {/* Editor */}
                  <div className="flex-1 overflow-hidden" style={{ minHeight: 0 }}>
                    <QueryEditor tabId={activeTab.id} />
                  </div>

                  {/* Results panel */}
                  <div
                    className="flex flex-col shrink-0 overflow-hidden"
                    style={{ height: resultsHeight, borderTop: '1px solid var(--color-border)' }}
                  >
                    <ResultsToolbar
                      result={activeTab.result}
                      error={activeTab.error}
                      isExecuting={activeTab.isExecuting}
                    />
                    <div className="flex-1 overflow-hidden">
                      {activeTab.result ? (
                        <ResultsGrid result={activeTab.result} />
                      ) : (
                        <div
                          className="flex h-full items-center justify-center"
                          style={{ color: 'var(--color-text-muted)', fontSize: 12 }}
                        >
                          Run a query to see results
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div
                  className="flex flex-1 items-center justify-center"
                  style={{ color: 'var(--color-text-muted)' }}
                >
                  <div className="text-center space-y-2">
                    <Database size={40} className="mx-auto opacity-20" />
                    <p className="text-sm">Connect to a database to get started</p>
                  </div>
                </div>
              )}
            </>
          )}
        </main>
      </div>

      {/* Status bar at the bottom */}
      <StatusBar result={activeTab?.result} />
    </div>
  )
}

function SectionHeader({ label }: { label: string }) {
  return (
    <div className="px-3 py-1.5 mt-1">
      <span
        className="font-semibold uppercase tracking-widest"
        style={{ color: 'var(--color-text-muted)', fontSize: 10 }}
      >
        {label}
      </span>
    </div>
  )
}
