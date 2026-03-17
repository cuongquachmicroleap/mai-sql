import { useState, useEffect } from 'react'
import { Code2, Plus, Trash2, Copy, Loader2 } from 'lucide-react'
import { nanoid } from 'nanoid'
import { useSnippetStore } from '../../stores/snippet-store'
import { useEditorStore } from '../../stores/editor-store'
import type { Snippet } from '@shared/types/snippet'

const CATEGORIES = [
  { value: 'admin', label: 'Admin', color: '#F87171' },
  { value: 'performance', label: 'Performance', color: '#FBBF24' },
  { value: 'schema', label: 'Schema', color: '#5B8AF0' },
  { value: 'data', label: 'Data', color: '#34D399' },
  { value: 'custom', label: 'Custom', color: '#A78BFA' },
] as const

export function SnippetPanel() {
  const { snippets, loading, activeCategory, loadSnippets, saveSnippet, deleteSnippet, setActiveCategory } = useSnippetStore()
  const { addTabWithContent } = useEditorStore()
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newSQL, setNewSQL] = useState('')
  const [newCategory, setNewCategory] = useState<Snippet['category']>('custom')

  useEffect(() => {
    loadSnippets()
  }, [loadSnippets])

  const filtered = activeCategory
    ? snippets.filter((s) => s.category === activeCategory)
    : snippets

  const handleInsert = (snippet: Snippet) => {
    addTabWithContent(snippet.title, snippet.sql)
  }

  const handleCreate = () => {
    if (!newTitle.trim() || !newSQL.trim()) return
    const snippet: Snippet = {
      id: nanoid(),
      title: newTitle.trim(),
      description: '',
      sql: newSQL.trim(),
      category: newCategory,
      isBuiltIn: false,
      createdAt: new Date().toISOString(),
    }
    saveSnippet(snippet)
    setCreating(false)
    setNewTitle('')
    setNewSQL('')
    setNewCategory('custom')
  }

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
        <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--mai-text-3)' }}>
          Snippets
        </span>
        <button
          onClick={() => setCreating(!creating)}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: creating ? 'var(--mai-accent)' : 'var(--mai-text-3)',
            padding: '2px 4px',
            borderRadius: 3,
          }}
          title="New snippet"
        >
          <Plus size={12} />
        </button>
      </div>

      {/* Category filters */}
      <div className="flex items-center gap-1 px-2 py-1.5 shrink-0 flex-wrap" style={{ borderBottom: '1px solid var(--mai-border)' }}>
        <button
          onClick={() => setActiveCategory(null)}
          style={{
            fontSize: 10,
            padding: '2px 6px',
            borderRadius: 3,
            border: 'none',
            cursor: 'pointer',
            background: activeCategory === null ? 'rgba(91,138,240,0.15)' : 'transparent',
            color: activeCategory === null ? 'var(--mai-accent)' : 'var(--mai-text-3)',
          }}
        >
          All
        </button>
        {CATEGORIES.map((cat) => (
          <button
            key={cat.value}
            onClick={() => setActiveCategory(cat.value === activeCategory ? null : cat.value)}
            style={{
              fontSize: 10,
              padding: '2px 6px',
              borderRadius: 3,
              border: 'none',
              cursor: 'pointer',
              background: activeCategory === cat.value ? `${cat.color}20` : 'transparent',
              color: activeCategory === cat.value ? cat.color : 'var(--mai-text-3)',
            }}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Create form */}
      {creating && (
        <div className="px-3 py-2 shrink-0" style={{ borderBottom: '1px solid var(--mai-border)', background: 'var(--mai-bg-elevated)' }}>
          <input
            type="text"
            placeholder="Snippet title..."
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            style={{
              width: '100%',
              background: 'var(--mai-bg-panel)',
              border: '1px solid var(--mai-border-strong)',
              borderRadius: 4,
              padding: '4px 8px',
              color: 'var(--mai-text-1)',
              fontSize: 11,
              outline: 'none',
              marginBottom: 4,
            }}
          />
          <textarea
            placeholder="SQL..."
            value={newSQL}
            onChange={(e) => setNewSQL(e.target.value)}
            rows={4}
            style={{
              width: '100%',
              background: 'var(--mai-bg-panel)',
              border: '1px solid var(--mai-border-strong)',
              borderRadius: 4,
              padding: '4px 8px',
              color: 'var(--mai-text-1)',
              fontSize: 11,
              fontFamily: "ui-monospace, 'SF Mono', monospace",
              outline: 'none',
              resize: 'vertical',
              marginBottom: 4,
            }}
          />
          <div className="flex items-center gap-2">
            <select
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value as Snippet['category'])}
              style={{
                background: 'var(--mai-bg-panel)',
                border: '1px solid var(--mai-border-strong)',
                borderRadius: 4,
                padding: '3px 6px',
                color: 'var(--mai-text-1)',
                fontSize: 10,
                outline: 'none',
              }}
            >
              {CATEGORIES.map((cat) => (
                <option key={cat.value} value={cat.value}>{cat.label}</option>
              ))}
            </select>
            <div className="flex-1" />
            <button
              onClick={() => setCreating(false)}
              style={{ fontSize: 10, color: 'var(--mai-text-3)', background: 'none', border: 'none', cursor: 'pointer', padding: '3px 8px' }}
            >
              Cancel
            </button>
            <button
              onClick={handleCreate}
              disabled={!newTitle.trim() || !newSQL.trim()}
              style={{
                fontSize: 10,
                color: '#fff',
                background: 'var(--mai-accent)',
                border: 'none',
                borderRadius: 4,
                cursor: 'pointer',
                padding: '3px 8px',
                opacity: newTitle.trim() && newSQL.trim() ? 1 : 0.4,
              }}
            >
              Save
            </button>
          </div>
        </div>
      )}

      {/* List */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {loading && (
          <div className="flex items-center justify-center py-8" style={{ color: 'var(--mai-text-3)' }}>
            <Loader2 size={14} className="animate-spin" />
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <div className="flex items-center justify-center py-8" style={{ color: 'var(--mai-text-3)', fontSize: 12 }}>
            No snippets found
          </div>
        )}

        {filtered.map((snippet) => {
          const cat = CATEGORIES.find((c) => c.value === snippet.category)
          return (
            <div
              key={snippet.id}
              onMouseEnter={() => setHoveredId(snippet.id)}
              onMouseLeave={() => setHoveredId(null)}
              onClick={() => handleInsert(snippet)}
              style={{
                padding: '8px 12px',
                borderBottom: '1px solid var(--mai-bg-hover)',
                background: hoveredId === snippet.id ? 'var(--mai-bg-hover)' : 'transparent',
                cursor: 'pointer',
                transition: 'background 0.1s',
              }}
            >
              <div className="flex items-center gap-1.5" style={{ marginBottom: 3 }}>
                <Code2 size={10} style={{ color: cat?.color ?? 'var(--mai-text-3)', flexShrink: 0 }} />
                <span style={{ fontSize: 11, color: 'var(--mai-text-1)', fontWeight: 500 }}>{snippet.title}</span>
                <div className="flex-1" />
                {hoveredId === snippet.id && (
                  <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(snippet.sql).catch(() => {})
                      }}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--mai-text-3)', padding: '1px 3px' }}
                      title="Copy SQL"
                    >
                      <Copy size={10} />
                    </button>
                    {!snippet.isBuiltIn && (
                      <button
                        onClick={() => deleteSnippet(snippet.id)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--mai-text-3)', padding: '1px 3px' }}
                        title="Delete"
                      >
                        <Trash2 size={10} />
                      </button>
                    )}
                  </div>
                )}
                {hoveredId !== snippet.id && (
                  <span
                    style={{
                      fontSize: 9,
                      padding: '1px 4px',
                      borderRadius: 3,
                      background: `${cat?.color ?? 'var(--mai-text-3)'}15`,
                      color: cat?.color ?? 'var(--mai-text-3)',
                    }}
                  >
                    {cat?.label ?? snippet.category}
                  </span>
                )}
              </div>
              <div
                style={{
                  fontSize: 10,
                  color: 'var(--mai-text-3)',
                  fontFamily: "ui-monospace, 'SF Mono', monospace",
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {snippet.sql.replace(/\s+/g, ' ').slice(0, 150)}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
