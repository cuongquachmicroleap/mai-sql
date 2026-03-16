import { nanoid } from 'nanoid'
import { Plus, X } from 'lucide-react'
import type { TableDesignerIndex, TableDesignerColumn } from '@shared/types/schema'

interface IndexesEditorProps {
  indexes: TableDesignerIndex[]
  columns: TableDesignerColumn[]
  onChange: (indexes: TableDesignerIndex[]) => void
}

const cellStyle: React.CSSProperties = {
  padding: '0 6px',
  height: 28,
  display: 'flex',
  alignItems: 'center',
  borderRight: '1px solid rgba(255,255,255,0.06)',
  borderBottom: '1px solid rgba(255,255,255,0.06)',
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  height: '100%',
  background: 'transparent',
  border: 'none',
  color: '#ECECEC',
  fontSize: 11,
  fontFamily: 'inherit',
  outline: 'none',
}

export function IndexesEditor({ indexes, columns, onChange }: IndexesEditorProps) {
  const update = (id: string, patch: Partial<TableDesignerIndex>) => {
    onChange(indexes.map((i) => (i._tempId === id ? { ...i, ...patch } : i)))
  }

  const remove = (id: string) => onChange(indexes.filter((i) => i._tempId !== id))

  const add = () => {
    onChange([...indexes, {
      _tempId: nanoid(),
      name: '',
      columns: [],
      isUnique: false,
    }])
  }

  const toggleColumn = (indexId: string, colName: string) => {
    const idx = indexes.find((i) => i._tempId === indexId)
    if (!idx) return
    const cols = idx.columns.includes(colName)
      ? idx.columns.filter((c) => c !== colName)
      : [...idx.columns, colName]
    update(indexId, { columns: cols })
  }

  const columnNames = columns.filter((c) => c.name.trim()).map((c) => c.name)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '2fr 3fr 60px 28px',
        background: '#1C1C20',
        borderBottom: '1px solid rgba(255,255,255,0.1)',
        fontSize: 10, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#555560',
      }}>
        {['Name', 'Columns', 'Unique', ''].map((h) => (
          <div key={h} style={{ ...cellStyle, borderBottom: 'none' }}>{h}</div>
        ))}
      </div>

      {/* Rows */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {indexes.map((idx) => (
          <div key={idx._tempId} style={{
            display: 'grid',
            gridTemplateColumns: '2fr 3fr 60px 28px',
          }}>
            <div style={cellStyle}>
              <input
                style={inputStyle}
                value={idx.name}
                onChange={(e) => update(idx._tempId, { name: e.target.value })}
                placeholder="idx_name"
                spellCheck={false}
              />
            </div>
            <div style={{ ...cellStyle, flexWrap: 'wrap', gap: 2, height: 'auto', minHeight: 28, padding: '3px 6px' }}>
              {columnNames.map((colName) => {
                const selected = idx.columns.includes(colName)
                return (
                  <button
                    key={colName}
                    onClick={() => toggleColumn(idx._tempId, colName)}
                    style={{
                      padding: '1px 6px',
                      fontSize: 10,
                      borderRadius: 3,
                      border: selected ? '1px solid #5B8AF0' : '1px solid rgba(255,255,255,0.12)',
                      background: selected ? 'rgba(91,138,240,0.15)' : 'transparent',
                      color: selected ? '#5B8AF0' : '#8B8B8B',
                      cursor: 'pointer',
                    }}
                  >
                    {colName}
                  </button>
                )
              })}
              {columnNames.length === 0 && (
                <span style={{ fontSize: 10, color: '#555560' }}>Define columns first</span>
              )}
            </div>
            <div style={{ ...cellStyle, justifyContent: 'center' }}>
              <input
                type="checkbox"
                checked={idx.isUnique}
                onChange={(e) => update(idx._tempId, { isUnique: e.target.checked })}
                style={{ accentColor: '#5B8AF0' }}
              />
            </div>
            <div style={{ ...cellStyle, justifyContent: 'center', borderRight: 'none' }}>
              <button
                onClick={() => remove(idx._tempId)}
                style={{ background: 'none', border: 'none', color: '#555560', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center' }}
                onMouseEnter={(e) => e.currentTarget.style.color = '#F87171'}
                onMouseLeave={(e) => e.currentTarget.style.color = '#555560'}
              >
                <X size={12} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Add button */}
      <div style={{ padding: 8, borderTop: '1px solid rgba(255,255,255,0.07)' }}>
        <button
          onClick={add}
          style={{
            display: 'flex', alignItems: 'center', gap: 4,
            background: 'none', border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 4, padding: '4px 10px',
            color: '#8B8B8B', fontSize: 11, cursor: 'pointer',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = '#ECECEC' }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = '#8B8B8B' }}
        >
          <Plus size={12} /> Add Index
        </button>
      </div>
    </div>
  )
}
