import { useState, useEffect } from 'react'
import { Clock, Star, Trash2, Play, Search, XCircle, CheckCircle2, Loader2 } from 'lucide-react'
import { useHistoryStore } from '../../stores/history-store'
import { useEditorStore } from '../../stores/editor-store'
import { useConnectionStore } from '../../stores/connection-store'

export function QueryHistory() {
  const { entries, loading, searchQuery, loadHistory, search, toggleFavorite, deleteEntry, clearHistory } = useHistoryStore()
  const { addTabWithContent } = useEditorStore()
  const { activeConnectionId } = useConnectionStore()
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false)

  useEffect(() => {
    loadHistory(activeConnectionId ?? undefined)
  }, [activeConnectionId, loadHistory])

  const handleSearch = (q: string) => {
    search(q, activeConnectionId ?? undefined)
  }

  const handleRerun = (entry: { sql: string; database: string }) => {
    addTabWithContent('History Query', entry.sql, entry.database || undefined)
  }

  const filtered = showFavoritesOnly ? entries.filter((e) => e.isFavorite) : entries

  return (
    <div className="flex flex-col h-full" style={{ background: 'var(--mai-bg-panel)' }}>
      {/* Header */}
      <div
        className="flex items-center justify-between shrink-0"
        style={{
          height: 40,
          padding: '0 12px',
          borderBottom: '1px solid var(--mai-border)',
        }}
      >
        <span
          style={{
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: 'var(--mai-text-3)',
          }}
        >
          Query History
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: showFavoritesOnly ? '#FBBF24' : 'var(--mai-text-3)',
              padding: '2px 4px',
              borderRadius: 3,
            }}
            title={showFavoritesOnly ? 'Show all' : 'Show favorites only'}
          >
            <Star size={12} fill={showFavoritesOnly ? '#FBBF24' : 'none'} />
          </button>
          <button
            onClick={() => clearHistory(activeConnectionId ?? undefined)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--mai-text-3)',
              padding: '2px 4px',
              borderRadius: 3,
            }}
            title="Clear history (keeps favorites)"
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="px-2 py-2 shrink-0" style={{ borderBottom: '1px solid var(--mai-border)' }}>
        <div
          className="flex items-center gap-1.5"
          style={{
            height: 28,
            background: 'var(--mai-bg-elevated)',
            borderRadius: 5,
            padding: '0 8px',
            border: '1px solid var(--mai-border-strong)',
          }}
        >
          <Search size={11} style={{ color: 'var(--mai-text-3)', flexShrink: 0 }} />
          <input
            type="text"
            placeholder="Search queries..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: 'var(--mai-text-1)',
              fontSize: 11,
            }}
          />
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {loading && (
          <div className="flex items-center justify-center py-8" style={{ color: 'var(--mai-text-3)' }}>
            <Loader2 size={14} className="animate-spin" />
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <div className="flex items-center justify-center py-8" style={{ color: 'var(--mai-text-3)', fontSize: 12 }}>
            No queries in history
          </div>
        )}

        {filtered.map((entry) => (
          <div
            key={entry.id}
            onMouseEnter={() => setHoveredId(entry.id)}
            onMouseLeave={() => setHoveredId(null)}
            style={{
              padding: '8px 12px',
              borderBottom: '1px solid var(--mai-bg-hover)',
              background: hoveredId === entry.id ? 'var(--mai-bg-hover)' : 'transparent',
              cursor: 'pointer',
              transition: 'background 0.1s',
            }}
            onClick={() => handleRerun(entry)}
          >
            {/* Top row: status + time */}
            <div className="flex items-center gap-1.5" style={{ marginBottom: 4 }}>
              {entry.status === 'success' ? (
                <CheckCircle2 size={10} style={{ color: '#34D399', flexShrink: 0 }} />
              ) : (
                <XCircle size={10} style={{ color: '#F87171', flexShrink: 0 }} />
              )}
              <span style={{ fontSize: 10, color: 'var(--mai-text-3)' }}>
                {new Date(entry.executedAt).toLocaleString()}
              </span>
              <span style={{ fontSize: 10, color: 'var(--mai-text-4)' }}>·</span>
              <span style={{ fontSize: 10, color: 'var(--mai-text-3)' }}>
                {entry.executionTimeMs}ms
              </span>
              {entry.rowCount > 0 && (
                <>
                  <span style={{ fontSize: 10, color: 'var(--mai-text-4)' }}>·</span>
                  <span style={{ fontSize: 10, color: 'var(--mai-text-3)' }}>
                    {entry.rowCount} rows
                  </span>
                </>
              )}
              <div className="flex-1" />
              {/* Actions */}
              {hoveredId === entry.id && (
                <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => toggleFavorite(entry.id)}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: entry.isFavorite ? '#FBBF24' : 'var(--mai-text-3)',
                      padding: '1px 3px',
                    }}
                    title={entry.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                  >
                    <Star size={10} fill={entry.isFavorite ? '#FBBF24' : 'none'} />
                  </button>
                  <button
                    onClick={() => handleRerun(entry)}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: 'var(--mai-accent)',
                      padding: '1px 3px',
                    }}
                    title="Open in new tab"
                  >
                    <Play size={10} />
                  </button>
                  <button
                    onClick={() => deleteEntry(entry.id)}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: 'var(--mai-text-3)',
                      padding: '1px 3px',
                    }}
                    title="Delete"
                  >
                    <Trash2 size={10} />
                  </button>
                </div>
              )}
              {hoveredId !== entry.id && entry.isFavorite && (
                <Star size={10} style={{ color: '#FBBF24', flexShrink: 0 }} fill="#FBBF24" />
              )}
            </div>

            {/* SQL preview */}
            <div
              style={{
                fontSize: 11,
                color: 'var(--mai-text-2)',
                fontFamily: "ui-monospace, 'SF Mono', monospace",
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                lineHeight: 1.4,
              }}
            >
              {entry.sql.replace(/\s+/g, ' ').slice(0, 200)}
            </div>

            {/* Connection + database */}
            <div className="flex items-center gap-1 mt-1" style={{ fontSize: 10, color: 'var(--mai-text-4)' }}>
              <Clock size={8} />
              <span>{entry.connectionName}</span>
              {entry.database && (
                <>
                  <span>/</span>
                  <span>{entry.database}</span>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
