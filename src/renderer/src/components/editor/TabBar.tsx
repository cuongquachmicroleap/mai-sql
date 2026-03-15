import { Plus, X } from 'lucide-react'
import { useEditorStore } from '../../stores/editor-store'

export function TabBar() {
  const { tabs, activeTabId, addTab, closeTab, setActiveTab } = useEditorStore()

  return (
    <div
      className="flex items-end overflow-x-auto shrink-0"
      style={{
        background: 'var(--color-bg-overlay)',
        borderBottom: '1px solid var(--color-border)',
        height: 36,
      }}
    >
      {tabs.map((tab) => {
        const isActive = activeTabId === tab.id
        return (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className="group flex h-full min-w-28 max-w-44 items-center gap-1.5 px-3 shrink-0 relative transition-colors"
            style={{
              fontSize: 12,
              fontFamily: 'var(--font-sans)',
              background: isActive ? 'var(--color-bg-surface)' : 'transparent',
              color: isActive ? 'var(--color-text-primary)' : 'var(--color-text-muted)',
              borderRight: '1px solid var(--color-border)',
              borderTop: isActive ? '2px solid #3B82F6' : '2px solid transparent',
            }}
          >
            {/* Executing dot: animated yellow pulse */}
            {tab.isExecuting && (
              <span
                className="h-1.5 w-1.5 shrink-0 rounded-full animate-pulse-yellow"
                style={{ background: '#F59E0B' }}
              />
            )}
            {/* Error indicator */}
            {tab.error && !tab.isExecuting && (
              <span
                className="h-1.5 w-1.5 shrink-0 rounded-full"
                style={{ background: 'var(--color-error)' }}
              />
            )}
            <span className="flex-1 truncate text-left">{tab.title}</span>
            <span
              role="button"
              onClick={(e) => { e.stopPropagation(); closeTab(tab.id) }}
              className="flex h-4 w-4 shrink-0 items-center justify-center rounded opacity-0 group-hover:opacity-100 transition-opacity"
              style={{ color: 'var(--color-text-muted)' }}
              onMouseEnter={(e) => e.currentTarget.style.color = 'var(--color-text-primary)'}
              onMouseLeave={(e) => e.currentTarget.style.color = 'var(--color-text-muted)'}
            >
              <X size={10} />
            </span>
          </button>
        )
      })}

      {/* New tab button */}
      <button
        onClick={addTab}
        className="flex h-full items-center px-2 transition-colors ml-auto shrink-0"
        style={{ color: 'var(--color-text-muted)' }}
        onMouseEnter={(e) => e.currentTarget.style.color = 'var(--color-text-primary)'}
        onMouseLeave={(e) => e.currentTarget.style.color = 'var(--color-text-muted)'}
        title="New tab (⌘T)"
      >
        <Plus size={14} />
      </button>
    </div>
  )
}
