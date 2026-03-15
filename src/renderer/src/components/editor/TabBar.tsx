import { Plus, X } from 'lucide-react'
import { useEditorStore } from '../../stores/editor-store'

export function TabBar() {
  const { tabs, activeTabId, addTab, closeTab, setActiveTab } = useEditorStore()

  return (
    <div
      className="flex items-end overflow-x-auto"
      style={{
        background: '#080808',
        borderBottom: '1px solid var(--color-border)',
        minHeight: 36,
        height: 36,
      }}
    >
      {tabs.map((tab) => {
        const isActive = activeTabId === tab.id
        return (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className="group flex h-full min-w-28 max-w-44 items-center gap-1.5 px-3 text-xs shrink-0 relative transition-colors"
            style={{
              background: isActive ? 'var(--color-background)' : 'transparent',
              color: isActive ? 'var(--color-foreground)' : 'var(--color-muted-foreground)',
              borderRight: '1px solid var(--color-border)',
              borderTop: isActive ? '1px solid var(--color-primary)' : '1px solid transparent',
            }}
          >
            {/* Dot when executing */}
            {tab.isExecuting && (
              <span
                className="h-1.5 w-1.5 shrink-0 rounded-full animate-pulse"
                style={{ background: 'var(--color-primary)' }}
              />
            )}
            {/* Error indicator */}
            {tab.error && !tab.isExecuting && (
              <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: 'var(--color-destructive)' }} />
            )}
            <span className="flex-1 truncate text-left">{tab.title}</span>
            <span
              role="button"
              onClick={(e) => { e.stopPropagation(); closeTab(tab.id) }}
              className="flex h-4 w-4 shrink-0 items-center justify-center rounded opacity-0 group-hover:opacity-100 transition-opacity"
              style={{ color: 'var(--color-muted-foreground)' }}
              onMouseEnter={(e) => e.currentTarget.style.color = 'var(--color-foreground)'}
              onMouseLeave={(e) => e.currentTarget.style.color = 'var(--color-muted-foreground)'}
            >
              <X size={10} />
            </span>
          </button>
        )
      })}

      {/* New tab button */}
      <button
        onClick={addTab}
        className="flex h-full items-center px-2 transition-colors"
        style={{ color: 'var(--color-muted-foreground)' }}
        onMouseEnter={(e) => e.currentTarget.style.color = 'var(--color-foreground)'}
        onMouseLeave={(e) => e.currentTarget.style.color = 'var(--color-muted-foreground)'}
        title="New tab (⌘T)"
      >
        <Plus size={14} />
      </button>
    </div>
  )
}
