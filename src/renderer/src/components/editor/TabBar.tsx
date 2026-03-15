import { Plus, X } from 'lucide-react'
import { useEditorStore } from '../../stores/editor-store'
import { cn } from '../../lib/utils'

export function TabBar() {
  const { tabs, activeTabId, addTab, closeTab, setActiveTab } = useEditorStore()

  return (
    <div className="flex h-9 items-center border-b border-border bg-muted/30 overflow-x-auto">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => setActiveTab(tab.id)}
          className={cn(
            'flex h-full min-w-28 max-w-48 items-center gap-1 border-r border-border px-3 text-sm shrink-0',
            'hover:bg-muted transition-colors',
            activeTabId === tab.id && 'bg-background border-t-2 border-t-primary'
          )}
        >
          <span className="flex-1 truncate text-left">{tab.title}</span>
          {tab.isExecuting && <span className="h-2 w-2 animate-pulse rounded-full bg-primary" />}
          <span
            role="button"
            onClick={(e) => { e.stopPropagation(); closeTab(tab.id) }}
            className="ml-1 rounded p-0.5 hover:bg-destructive/20 hover:text-destructive"
          >
            <X className="h-3 w-3" />
          </span>
        </button>
      ))}
      <button
        onClick={addTab}
        className="flex h-full items-center px-2 hover:bg-muted transition-colors"
        title="New tab (Cmd+T)"
      >
        <Plus className="h-4 w-4" />
      </button>
    </div>
  )
}
