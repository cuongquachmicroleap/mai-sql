import { useState } from 'react'
import { useConnectionStore } from '../../stores/connection-store'
import { useEditorStore } from '../../stores/editor-store'
import { ConnectionList } from '../sidebar/ConnectionList'
import { DatabaseTree } from '../sidebar/DatabaseTree'
import { ConnectionForm } from '../settings/ConnectionForm'
import { TabBar } from '../editor/TabBar'
import { QueryEditor } from '../editor/QueryEditor'
import { EditorToolbar } from '../editor/EditorToolbar'
import { ResultsGrid } from '../results/ResultsGrid'
import { ResultsToolbar } from '../results/ResultsToolbar'
import { ERDiagram } from '../er-diagram/ERDiagram'
import { Database, Settings, ChevronLeft, ChevronRight, Network } from 'lucide-react'

type ActiveView = 'editor' | 'er-diagram'

export function MainLayout() {
  const { activeConnectionId } = useConnectionStore()
  const { tabs, activeTabId } = useEditorStore()
  const activeTab = tabs.find((t) => t.id === activeTabId) ?? tabs[0]
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [sidebarWidth] = useState(260)
  const [resultsHeight] = useState(260)
  const [activeView, setActiveView] = useState<ActiveView>('editor')

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--color-background)', color: 'var(--color-foreground)' }}>

      {/* Activity bar (far left, icon strip) */}
      <div className="flex flex-col items-center gap-1 py-2 w-10 shrink-0" style={{ background: '#0a0a0a', borderRight: '1px solid var(--color-border)' }}>
        <button
          onClick={() => { setSidebarCollapsed((v) => !v); setActiveView('editor') }}
          className="flex h-8 w-8 items-center justify-center rounded transition-colors hover:text-white"
          style={{ color: (!sidebarCollapsed || activeView === 'editor') ? 'var(--color-primary)' : 'var(--color-muted-foreground)' }}
          title="Toggle sidebar"
        >
          <Database size={16} />
        </button>
        <button
          onClick={() => setActiveView((v) => v === 'er-diagram' ? 'editor' : 'er-diagram')}
          className="flex h-8 w-8 items-center justify-center rounded transition-colors hover:text-white"
          style={{ color: activeView === 'er-diagram' ? 'var(--color-primary)' : 'var(--color-muted-foreground)' }}
          title="ER Diagram"
        >
          <Network size={16} />
        </button>
        <div className="flex-1" />
        <button
          className="flex h-8 w-8 items-center justify-center rounded transition-colors hover:text-white mb-1"
          style={{ color: 'var(--color-muted-foreground)' }}
          title="Settings"
        >
          <Settings size={15} />
        </button>
      </div>

      {/* Sidebar */}
      {!sidebarCollapsed && (
        <div
          className="flex flex-col shrink-0 overflow-hidden relative"
          style={{ width: sidebarWidth, background: '#0d0d0d', borderRight: '1px solid var(--color-border)' }}
        >
          {/* Sidebar header */}
          <div className="flex items-center justify-between px-3 py-2" style={{ borderBottom: '1px solid var(--color-border)', minHeight: 40 }}>
            <span className="text-xs font-semibold tracking-widest uppercase" style={{ color: 'var(--color-muted-foreground)', letterSpacing: '0.08em' }}>
              Explorer
            </span>
            <button
              onClick={() => setSidebarCollapsed(true)}
              className="flex h-5 w-5 items-center justify-center rounded transition-colors hover:text-white"
              style={{ color: 'var(--color-muted-foreground)' }}
            >
              <ChevronLeft size={13} />
            </button>
          </div>

          {/* New connection button */}
          <div className="px-2 py-2" style={{ borderBottom: '1px solid var(--color-border)' }}>
            <ConnectionForm />
          </div>

          {/* Connections section */}
          <div className="flex-1 overflow-y-auto">
            <SectionHeader label="Connections" />
            <ConnectionList />

            {activeConnectionId && (
              <>
                <SectionHeader label="Schema" />
                <DatabaseTree connectionId={activeConnectionId} />
              </>
            )}
          </div>
        </div>
      )}

      {/* Collapsed sidebar toggle */}
      {sidebarCollapsed && (
        <button
          onClick={() => setSidebarCollapsed(false)}
          className="flex items-center justify-center w-4 hover:w-5 transition-all"
          style={{ background: 'var(--color-border)', cursor: 'col-resize' }}
          title="Expand sidebar"
        >
          <ChevronRight size={10} style={{ color: 'var(--color-muted-foreground)' }} />
        </button>
      )}

      {/* Main editor area */}
      <main className="flex flex-1 flex-col overflow-hidden">
        {activeView === 'er-diagram' ? (
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
                      <div className="flex h-full items-center justify-center" style={{ color: 'var(--color-muted-foreground)', fontSize: 12 }}>
                        Run a query to see results
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-1 items-center justify-center" style={{ color: 'var(--color-muted-foreground)' }}>
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
  )
}

function SectionHeader({ label }: { label: string }) {
  return (
    <div className="px-3 py-1.5 mt-1">
      <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--color-muted-foreground)', fontSize: 10 }}>
        {label}
      </span>
    </div>
  )
}
