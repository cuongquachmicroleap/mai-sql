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

export function MainLayout() {
  const { activeConnectionId } = useConnectionStore()
  const { tabs, activeTabId } = useEditorStore()
  const activeTab = tabs.find((t) => t.id === activeTabId) ?? tabs[0]

  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground">
      {/* Sidebar */}
      <aside className="flex flex-col border-r border-border shrink-0 overflow-hidden" style={{ width: 260 }}>
        <div className="p-2 border-b border-border">
          <ConnectionForm />
        </div>
        <div className="overflow-y-auto flex-1">
          <div className="py-1">
            <p className="px-3 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Connections</p>
            <ConnectionList />
          </div>
          {activeConnectionId && (
            <div className="py-1 border-t border-border">
              <p className="px-3 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Schema</p>
              <DatabaseTree connectionId={activeConnectionId} />
            </div>
          )}
        </div>
      </aside>

      {/* Main content */}
      <main className="flex flex-1 flex-col overflow-hidden">
        <TabBar />
        {activeTab && (
          <div className="flex flex-1 flex-col overflow-hidden">
            <EditorToolbar tabId={activeTab.id} />
            <div style={{ flex: 1, minHeight: 0 }}>
              <QueryEditor tabId={activeTab.id} />
            </div>
            <div style={{ height: 280 }} className="border-t border-border flex flex-col shrink-0">
              <ResultsToolbar
                result={activeTab.result}
                error={activeTab.error}
                isExecuting={activeTab.isExecuting}
              />
              <div className="flex-1 overflow-hidden">
                {activeTab.result && <ResultsGrid result={activeTab.result} />}
                {!activeTab.result && !activeTab.error && !activeTab.isExecuting && (
                  <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                    Run a query to see results
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
