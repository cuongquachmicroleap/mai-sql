import { nanoid } from 'nanoid'
import { Plus, X } from 'lucide-react'
import type { TableDesignerColumn } from '@shared/types/schema'

const COMMON_TYPES = [
  'integer', 'bigint', 'serial', 'bigserial',
  'text', 'varchar(255)', 'char(1)',
  'boolean',
  'timestamp', 'timestamptz', 'date', 'time',
  'numeric', 'numeric(10,2)', 'real', 'double precision',
  'uuid', 'jsonb', 'json', 'bytea',
]

interface ColumnsEditorProps {
  columns: TableDesignerColumn[]
  enumNames?: string[]
  onChange: (columns: TableDesignerColumn[]) => void
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

export function ColumnsEditor({ columns, enumNames = [], onChange }: ColumnsEditorProps) {
  const update = (id: string, patch: Partial<TableDesignerColumn>) => {
    onChange(columns.map((c) => {
      if (c._tempId !== id) return c
      const updated = { ...c, ...patch }
      // PK columns must be NOT NULL
      if (patch.isPrimaryKey && patch.isPrimaryKey === true) updated.nullable = false
      return updated
    }))
  }

  const remove = (id: string) => onChange(columns.filter((c) => c._tempId !== id))

  const add = () => {
    onChange([...columns, {
      _tempId: nanoid(),
      name: '',
      type: '',
      nullable: true,
      defaultValue: '',
      isPrimaryKey: false,
      comment: '',
    }])
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '2fr 2fr 56px 56px 2fr 2fr 28px',
        background: '#1C1C20',
        borderBottom: '1px solid rgba(255,255,255,0.1)',
        fontSize: 10,
        fontWeight: 600,
        letterSpacing: '0.06em',
        textTransform: 'uppercase',
        color: '#555560',
      }}>
        {['Name', 'Type', 'Null', 'PK', 'Default', 'Comment', ''].map((h) => (
          <div key={h} style={{ ...cellStyle, borderBottom: 'none' }}>{h}</div>
        ))}
      </div>

      {/* Rows */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {columns.map((col) => (
          <div key={col._tempId} style={{
            display: 'grid',
            gridTemplateColumns: '2fr 2fr 56px 56px 2fr 2fr 28px',
          }}>
            <div style={cellStyle}>
              <input
                style={inputStyle}
                value={col.name}
                onChange={(e) => update(col._tempId, { name: e.target.value })}
                placeholder="column_name"
                spellCheck={false}
              />
            </div>
            <div style={cellStyle}>
              <input
                style={inputStyle}
                list="common-types"
                value={col.type}
                onChange={(e) => update(col._tempId, { type: e.target.value })}
                placeholder="type"
                spellCheck={false}
              />
            </div>
            <div style={{ ...cellStyle, justifyContent: 'center' }}>
              <input
                type="checkbox"
                checked={col.nullable}
                onChange={(e) => update(col._tempId, { nullable: e.target.checked })}
                style={{ accentColor: '#5B8AF0' }}
                disabled={col.isPrimaryKey}
              />
            </div>
            <div style={{ ...cellStyle, justifyContent: 'center' }}>
              <input
                type="checkbox"
                checked={col.isPrimaryKey}
                onChange={(e) => update(col._tempId, { isPrimaryKey: e.target.checked })}
                style={{ accentColor: '#FBBF24' }}
              />
            </div>
            <div style={cellStyle}>
              <input
                style={inputStyle}
                value={col.defaultValue}
                onChange={(e) => update(col._tempId, { defaultValue: e.target.value })}
                placeholder="default"
                spellCheck={false}
              />
            </div>
            <div style={cellStyle}>
              <input
                style={inputStyle}
                value={col.comment}
                onChange={(e) => update(col._tempId, { comment: e.target.value })}
                placeholder="comment"
                spellCheck={false}
              />
            </div>
            <div style={{ ...cellStyle, justifyContent: 'center', borderRight: 'none', cursor: 'pointer' }}>
              <button
                onClick={() => remove(col._tempId)}
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
          <Plus size={12} /> Add Column
        </button>
      </div>

      {/* Shared datalist for type suggestions — includes user-defined enums */}
      <datalist id="common-types">
        {enumNames.map((name) => <option key={`enum:${name}`} value={name} />)}
        {COMMON_TYPES.map((t) => <option key={t} value={t} />)}
      </datalist>
    </div>
  )
}
