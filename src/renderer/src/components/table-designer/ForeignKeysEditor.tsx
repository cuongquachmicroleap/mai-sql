import { nanoid } from 'nanoid'
import { Plus, X } from 'lucide-react'
import type { TableDesignerForeignKey, TableDesignerColumn } from '@shared/types/schema'

const FK_ACTIONS = ['NO ACTION', 'CASCADE', 'SET NULL', 'SET DEFAULT', 'RESTRICT']

interface ForeignKeysEditorProps {
  foreignKeys: TableDesignerForeignKey[]
  columns: TableDesignerColumn[]
  onChange: (fks: TableDesignerForeignKey[]) => void
}

const cellStyle: React.CSSProperties = {
  padding: '4px 6px',
  display: 'flex',
  alignItems: 'center',
  borderRight: '1px solid var(--mai-border)',
  borderBottom: '1px solid var(--mai-border)',
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: 'transparent',
  border: 'none',
  color: 'var(--mai-text-1)',
  fontSize: 11,
  fontFamily: 'inherit',
  outline: 'none',
}

const selectStyle: React.CSSProperties = {
  width: '100%',
  background: 'var(--mai-bg-panel)',
  border: '1px solid var(--mai-border-strong)',
  borderRadius: 3,
  color: 'var(--mai-text-1)',
  fontSize: 11,
  fontFamily: 'inherit',
  outline: 'none',
  padding: '2px 4px',
}

export function ForeignKeysEditor({ foreignKeys, columns, onChange }: ForeignKeysEditorProps) {
  const update = (id: string, patch: Partial<TableDesignerForeignKey>) => {
    onChange(foreignKeys.map((f) => (f._tempId === id ? { ...f, ...patch } : f)))
  }

  const remove = (id: string) => onChange(foreignKeys.filter((f) => f._tempId !== id))

  const add = () => {
    onChange([...foreignKeys, {
      _tempId: nanoid(),
      constraintName: '',
      columns: [],
      targetTable: '',
      targetColumns: [],
      onDelete: 'NO ACTION',
      onUpdate: 'NO ACTION',
    }])
  }

  const columnNames = columns.filter((c) => c.name.trim()).map((c) => c.name)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {foreignKeys.length === 0 && (
          <div style={{ padding: 20, textAlign: 'center', color: 'var(--mai-text-3)', fontSize: 12 }}>
            No foreign keys defined. Click "Add Foreign Key" to create one.
          </div>
        )}

        {foreignKeys.map((fk) => (
          <div
            key={fk._tempId}
            style={{
              margin: 8,
              border: '1px solid var(--mai-border-strong)',
              borderRadius: 6,
              background: 'rgba(255,255,255,0.02)',
            }}
          >
            {/* Header row with constraint name and delete */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px', borderBottom: '1px solid var(--mai-border)' }}>
              <span style={{ fontSize: 10, color: 'var(--mai-text-3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', flexShrink: 0 }}>Constraint</span>
              <input
                style={{ ...inputStyle, flex: 1 }}
                value={fk.constraintName}
                onChange={(e) => update(fk._tempId, { constraintName: e.target.value })}
                placeholder="fk_name"
                spellCheck={false}
              />
              <button
                onClick={() => remove(fk._tempId)}
                style={{ background: 'none', border: 'none', color: 'var(--mai-text-3)', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center' }}
                onMouseEnter={(e) => e.currentTarget.style.color = '#F87171'}
                onMouseLeave={(e) => e.currentTarget.style.color = 'var(--mai-text-3)'}
              >
                <X size={14} />
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0 }}>
              {/* Source columns */}
              <div style={cellStyle}>
                <div style={{ width: '100%' }}>
                  <div style={{ fontSize: 10, color: 'var(--mai-text-3)', marginBottom: 4, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Source Columns</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                    {columnNames.map((colName) => {
                      const selected = fk.columns.includes(colName)
                      return (
                        <button
                          key={colName}
                          onClick={() => {
                            const cols = selected
                              ? fk.columns.filter((c) => c !== colName)
                              : [...fk.columns, colName]
                            update(fk._tempId, { columns: cols })
                          }}
                          style={{
                            padding: '1px 6px', fontSize: 10, borderRadius: 3,
                            border: selected ? '1px solid var(--mai-accent)' : '1px solid var(--mai-border-strong)',
                            background: selected ? 'rgba(91,138,240,0.15)' : 'transparent',
                            color: selected ? 'var(--mai-accent)' : 'var(--mai-text-2)', cursor: 'pointer',
                          }}
                        >
                          {colName}
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>

              {/* Target table & columns */}
              <div style={{ ...cellStyle, borderRight: 'none' }}>
                <div style={{ width: '100%' }}>
                  <div style={{ fontSize: 10, color: 'var(--mai-text-3)', marginBottom: 4, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Target Table</div>
                  <input
                    style={{ ...inputStyle, marginBottom: 6, borderBottom: '1px solid var(--mai-border-strong)', paddingBottom: 4 }}
                    value={fk.targetTable}
                    onChange={(e) => update(fk._tempId, { targetTable: e.target.value })}
                    placeholder="schema.table"
                    spellCheck={false}
                  />
                  <div style={{ fontSize: 10, color: 'var(--mai-text-3)', marginBottom: 4, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Target Columns</div>
                  <input
                    style={inputStyle}
                    value={fk.targetColumns.join(', ')}
                    onChange={(e) => update(fk._tempId, { targetColumns: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })}
                    placeholder="id, col2"
                    spellCheck={false}
                  />
                </div>
              </div>
            </div>

            {/* Actions row */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0, borderTop: '1px solid var(--mai-border)' }}>
              <div style={{ ...cellStyle, gap: 6 }}>
                <span style={{ fontSize: 10, color: 'var(--mai-text-3)', fontWeight: 600, flexShrink: 0 }}>ON DELETE</span>
                <select style={selectStyle} value={fk.onDelete} onChange={(e) => update(fk._tempId, { onDelete: e.target.value })}>
                  {FK_ACTIONS.map((a) => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>
              <div style={{ ...cellStyle, gap: 6, borderRight: 'none' }}>
                <span style={{ fontSize: 10, color: 'var(--mai-text-3)', fontWeight: 600, flexShrink: 0 }}>ON UPDATE</span>
                <select style={selectStyle} value={fk.onUpdate} onChange={(e) => update(fk._tempId, { onUpdate: e.target.value })}>
                  {FK_ACTIONS.map((a) => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add button */}
      <div style={{ padding: 8, borderTop: '1px solid var(--mai-border)' }}>
        <button
          onClick={add}
          style={{
            display: 'flex', alignItems: 'center', gap: 4,
            background: 'none', border: '1px solid var(--mai-border-strong)',
            borderRadius: 4, padding: '4px 10px',
            color: 'var(--mai-text-2)', fontSize: 11, cursor: 'pointer',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--mai-bg-hover)'; e.currentTarget.style.color = 'var(--mai-text-1)' }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'var(--mai-text-2)' }}
        >
          <Plus size={12} /> Add Foreign Key
        </button>
      </div>
    </div>
  )
}
