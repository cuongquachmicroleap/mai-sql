import { useState } from 'react'
import { nanoid } from 'nanoid'
import { Plus, X, GripVertical, Loader2 } from 'lucide-react'
import type { TableDesignerEnum } from '@shared/types/schema'

interface EnumsEditorProps {
  enums: TableDesignerEnum[]
  existingEnums?: { name: string; values: string[] }[]
  loadingExisting?: boolean
  onChange: (enums: TableDesignerEnum[]) => void
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

export function EnumsEditor({ enums, existingEnums = [], loadingExisting = false, onChange }: EnumsEditorProps) {
  const [newValueInputs, setNewValueInputs] = useState<Record<string, string>>({})

  const update = (id: string, patch: Partial<TableDesignerEnum>) => {
    onChange(enums.map((e) => (e._tempId === id ? { ...e, ...patch } : e)))
  }

  const remove = (id: string) => onChange(enums.filter((e) => e._tempId !== id))

  const add = () => {
    onChange([...enums, {
      _tempId: nanoid(),
      name: '',
      values: [],
    }])
  }

  const addValue = (enumId: string) => {
    const val = (newValueInputs[enumId] ?? '').trim()
    if (!val) return
    const en = enums.find((e) => e._tempId === enumId)
    if (!en || en.values.includes(val)) return
    update(enumId, { values: [...en.values, val] })
    setNewValueInputs((prev) => ({ ...prev, [enumId]: '' }))
  }

  const removeValue = (enumId: string, val: string) => {
    const en = enums.find((e) => e._tempId === enumId)
    if (!en) return
    update(enumId, { values: en.values.filter((v) => v !== val) })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ flex: 1, overflowY: 'auto' }}>

        {/* ── Existing Enums (read-only reference) ── */}
        <div style={{ padding: '10px 12px 4px' }}>
          <div style={{
            fontSize: 10, fontWeight: 600, letterSpacing: '0.09em',
            textTransform: 'uppercase', color: 'var(--mai-text-3)', marginBottom: 6,
          }}>
            Existing Enums in Schema
          </div>
        </div>

        {loadingExisting && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 12px', color: 'var(--mai-text-3)' }}>
            <Loader2 size={11} className="animate-spin" />
            <span style={{ fontSize: 11 }}>Loading enums...</span>
          </div>
        )}

        {!loadingExisting && existingEnums.length === 0 && (
          <div style={{ padding: '4px 12px 12px', color: 'var(--mai-text-3)', fontSize: 11 }}>
            No enum types found in this schema.
          </div>
        )}

        {!loadingExisting && existingEnums.map((en) => (
          <div
            key={en.name}
            style={{
              margin: '0 8px 6px',
              border: '1px solid var(--mai-bg-hover)',
              borderRadius: 6,
              background: 'rgba(255,255,255,0.01)',
            }}
          >
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '5px 8px',
              borderBottom: '1px solid var(--mai-bg-hover)',
            }}>
              <span style={{
                fontSize: 9, color: '#6B6B7B', fontWeight: 600,
                textTransform: 'uppercase', letterSpacing: '0.06em', flexShrink: 0,
                padding: '1px 5px', borderRadius: 3,
                background: 'rgba(167,139,250,0.08)', border: '1px solid rgba(167,139,250,0.15)',
              }}>
                ENUM
              </span>
              <span style={{ fontSize: 12, color: 'var(--mai-text-1)', fontWeight: 500, fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace' }}>
                {en.name}
              </span>
              <span style={{ fontSize: 10, color: 'var(--mai-text-3)', marginLeft: 'auto' }}>
                {en.values.length} value{en.values.length !== 1 ? 's' : ''}
              </span>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3, padding: '5px 8px' }}>
              {en.values.map((val, idx) => (
                <span
                  key={`${val}-${idx}`}
                  style={{
                    display: 'inline-block',
                    padding: '1px 7px',
                    background: 'var(--mai-bg-hover)',
                    border: '1px solid var(--mai-border-strong)',
                    borderRadius: 3,
                    fontSize: 10, color: 'var(--mai-text-2)',
                    fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace',
                  }}
                >
                  {val}
                </span>
              ))}
            </div>
          </div>
        ))}

        {/* ── Divider ── */}
        <div style={{ padding: '12px 12px 4px' }}>
          <div style={{
            fontSize: 10, fontWeight: 600, letterSpacing: '0.09em',
            textTransform: 'uppercase', color: 'var(--mai-text-3)', marginBottom: 6,
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <span>New Enums</span>
            <div style={{ flex: 1, height: 1, background: 'var(--mai-border)' }} />
          </div>
        </div>

        {enums.length === 0 && (
          <div style={{ padding: '4px 12px 12px', color: 'var(--mai-text-3)', fontSize: 11 }}>
            No new enum types defined. Click "Add Enum" to create one.
          </div>
        )}

        {enums.map((en) => (
          <div
            key={en._tempId}
            style={{
              margin: '0 8px 6px',
              border: '1px solid var(--mai-border-strong)',
              borderRadius: 6,
              background: 'rgba(255,255,255,0.02)',
            }}
          >
            {/* Header — enum name + delete */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '6px 8px',
              borderBottom: '1px solid var(--mai-border)',
            }}>
              <span style={{
                fontSize: 10, color: '#A78BFA', fontWeight: 600,
                textTransform: 'uppercase', letterSpacing: '0.06em', flexShrink: 0,
              }}>
                ENUM
              </span>
              <input
                style={{ ...inputStyle, flex: 1, fontWeight: 500 }}
                value={en.name}
                onChange={(e) => update(en._tempId, { name: e.target.value })}
                placeholder="status_type"
                spellCheck={false}
              />
              <button
                onClick={() => remove(en._tempId)}
                style={{ background: 'none', border: 'none', color: 'var(--mai-text-3)', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center' }}
                onMouseEnter={(e) => e.currentTarget.style.color = '#F87171'}
                onMouseLeave={(e) => e.currentTarget.style.color = 'var(--mai-text-3)'}
              >
                <X size={14} />
              </button>
            </div>

            {/* Values list */}
            <div style={{ padding: '6px 8px' }}>
              <div style={{
                fontSize: 10, color: 'var(--mai-text-3)', fontWeight: 600,
                textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6,
              }}>
                Values ({en.values.length})
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 8 }}>
                {en.values.map((val, idx) => (
                  <span
                    key={`${val}-${idx}`}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 4,
                      padding: '2px 8px',
                      background: 'rgba(167,139,250,0.1)',
                      border: '1px solid rgba(167,139,250,0.25)',
                      borderRadius: 4,
                      fontSize: 11, color: '#D4BFFF',
                    }}
                  >
                    <GripVertical size={8} style={{ color: 'var(--mai-text-3)', cursor: 'grab' }} />
                    {val}
                    <button
                      onClick={() => removeValue(en._tempId, val)}
                      style={{
                        background: 'none', border: 'none', padding: 0,
                        color: 'var(--mai-text-3)', cursor: 'pointer', display: 'flex', alignItems: 'center',
                        marginLeft: 2,
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.color = '#F87171'}
                      onMouseLeave={(e) => e.currentTarget.style.color = 'var(--mai-text-3)'}
                    >
                      <X size={10} />
                    </button>
                  </span>
                ))}
              </div>

              {/* Add value input */}
              <div style={{ display: 'flex', gap: 4 }}>
                <input
                  style={{
                    flex: 1, height: 24, padding: '0 8px',
                    background: 'var(--mai-bg-hover)',
                    border: '1px solid var(--mai-border-strong)',
                    borderRadius: 4, color: 'var(--mai-text-1)', fontSize: 11,
                    fontFamily: 'inherit', outline: 'none',
                  }}
                  value={newValueInputs[en._tempId] ?? ''}
                  onChange={(e) => setNewValueInputs((prev) => ({ ...prev, [en._tempId]: e.target.value }))}
                  onKeyDown={(e) => { if (e.key === 'Enter') addValue(en._tempId) }}
                  placeholder="Add value..."
                  spellCheck={false}
                />
                <button
                  onClick={() => addValue(en._tempId)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 2,
                    background: 'none', border: '1px solid var(--mai-border-strong)',
                    borderRadius: 4, padding: '0 8px',
                    color: 'var(--mai-text-2)', fontSize: 10, cursor: 'pointer',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--mai-bg-hover)'; e.currentTarget.style.color = 'var(--mai-text-1)' }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'var(--mai-text-2)' }}
                >
                  <Plus size={10} /> Add
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add enum button */}
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
          <Plus size={12} /> Add Enum
        </button>
      </div>
    </div>
  )
}
