import { useState } from 'react'
import { Plus, X, Table2 } from 'lucide-react'
import { useEditorStore } from '../../stores/editor-store'

export function TabBar() {
  const { tabs, activeTabId, addTab, closeTab, setActiveTab } = useEditorStore()
  const [hoveredTabId, setHoveredTabId] = useState<string | null>(null)
  const [hoveredNew, setHoveredNew] = useState(false)

  return (
    <div
      className="flex items-end overflow-x-auto shrink-0"
      style={{
        background: '#131316',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
        height: 36,
      }}
    >
      {tabs.map((tab) => {
        const isActive = activeTabId === tab.id
        const isHovered = hoveredTabId === tab.id
        return (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            onMouseEnter={() => setHoveredTabId(tab.id)}
            onMouseLeave={() => setHoveredTabId(null)}
            className="group flex h-full items-center gap-1.5 px-3 shrink-0 relative"
            style={{
              minWidth: 120,
              maxWidth: 200,
              fontSize: 12,
              fontFamily: 'inherit',
              background: isActive ? '#1C1C20' : isHovered ? 'rgba(255,255,255,0.04)' : 'transparent',
              color: isActive ? '#ECECEC' : isHovered ? '#8B8B8B' : '#555560',
              borderRight: '1px solid rgba(255,255,255,0.07)',
              borderTop: isActive ? '2px solid #5B8AF0' : '2px solid transparent',
              borderLeft: 'none',
              borderBottom: 'none',
              cursor: 'pointer',
              transition: 'color 0.12s, background 0.12s',
              paddingTop: isActive ? 0 : 2,
            }}
          >
            {/* Table designer icon */}
            {tab.type === 'table-designer' && (
              <Table2 size={11} className="shrink-0" style={{ color: '#F97316' }} />
            )}
            {/* Executing dot: animated amber pulse */}
            {tab.type !== 'table-designer' && tab.isExecuting && (
              <span
                className="h-1.5 w-1.5 shrink-0 rounded-full animate-pulse-yellow"
                style={{ background: '#FBBF24' }}
              />
            )}
            {/* Error indicator */}
            {tab.type !== 'table-designer' && tab.error && !tab.isExecuting && (
              <span
                className="h-1.5 w-1.5 shrink-0 rounded-full"
                style={{ background: '#F87171' }}
              />
            )}
            <span className="flex-1 truncate text-left">{tab.title}</span>
            {/* Close button — visible on hover */}
            <span
              role="button"
              onClick={(e) => { e.stopPropagation(); closeTab(tab.id) }}
              className="flex items-center justify-center rounded"
              style={{
                width: 14,
                height: 14,
                flexShrink: 0,
                opacity: isHovered || isActive ? 1 : 0,
                color: '#555560',
                transition: 'opacity 0.12s, color 0.12s',
              }}
              onMouseEnter={(e) => e.currentTarget.style.color = '#ECECEC'}
              onMouseLeave={(e) => e.currentTarget.style.color = '#555560'}
            >
              <X size={10} />
            </span>
          </button>
        )
      })}

      {/* New tab button — far right */}
      <button
        onClick={addTab}
        onMouseEnter={() => setHoveredNew(true)}
        onMouseLeave={() => setHoveredNew(false)}
        className="flex h-full items-center px-2 shrink-0 ml-auto"
        style={{
          color: hoveredNew ? '#8B8B8B' : '#555560',
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          transition: 'color 0.12s',
        }}
        title="New tab (⌘T)"
      >
        <Plus size={14} />
      </button>
    </div>
  )
}
