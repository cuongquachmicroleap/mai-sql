import { useState, useCallback, useEffect } from 'react'
import { Loader2, Check, AlertCircle } from 'lucide-react'
import { useEditorStore } from '../../stores/editor-store'
import { invoke } from '../../lib/ipc-client'
import { generateCreateTableSQL, generateAlterTableSQL } from '../../lib/ddl-generator'
import { ColumnsEditor } from './ColumnsEditor'
import { IndexesEditor } from './IndexesEditor'
import { ForeignKeysEditor } from './ForeignKeysEditor'
import { EnumsEditor } from './EnumsEditor'
import { SQLPreview } from './SQLPreview'
import type { TableDesignerState } from '@shared/types/schema'

type DesignerSection = 'columns' | 'indexes' | 'foreignKeys' | 'enums' | 'sql'

interface TableDesignerProps {
  tabId: string
}

const sectionTabs: { key: DesignerSection; label: string }[] = [
  { key: 'columns', label: 'Columns' },
  { key: 'indexes', label: 'Indexes' },
  { key: 'foreignKeys', label: 'Foreign Keys' },
  { key: 'enums', label: 'Enums' },
  { key: 'sql', label: 'SQL' },
]

export function TableDesigner({ tabId }: TableDesignerProps) {
  const tab = useEditorStore((s) => s.tabs.find((t) => t.id === tabId))
  const updateDesignerState = useEditorStore((s) => s.updateDesignerState)

  const [activeSection, setActiveSection] = useState<DesignerSection>('columns')
  const [applying, setApplying] = useState(false)
  const [applyResult, setApplyResult] = useState<{ ok: boolean; message: string } | null>(null)

  const state = tab?.designerState
  const mode = tab?.designerMode ?? 'create'
  const connectionId = tab?.connectionId

  // Fetch all existing enum types in the schema for the reference list
  const [existingEnums, setExistingEnums] = useState<{ name: string; values: string[] }[]>([])
  const [loadingEnums, setLoadingEnums] = useState(false)

  useEffect(() => {
    if (!connectionId || !state?.schema) return
    let cancelled = false
    setLoadingEnums(true)
    invoke('query:execute', connectionId,
      `SELECT t.typname AS name, e.enumlabel AS value, e.enumsortorder AS sort_order ` +
      `FROM pg_type t ` +
      `JOIN pg_enum e ON e.enumtypid = t.oid ` +
      `JOIN pg_namespace n ON t.typnamespace = n.oid ` +
      `WHERE n.nspname = '${state.schema.replace(/'/g, "''")}' ` +
      `ORDER BY t.typname, e.enumsortorder`
    ).then((result) => {
      if (cancelled) return
      // Group rows by enum name
      const grouped = new Map<string, string[]>()
      for (const row of result.rows as Record<string, unknown>[]) {
        const name = String(row['name'])
        const value = String(row['value'])
        if (!grouped.has(name)) grouped.set(name, [])
        grouped.get(name)!.push(value)
      }
      setExistingEnums(Array.from(grouped.entries()).map(([name, values]) => ({ name, values })))
    }).catch(() => {
      if (!cancelled) setExistingEnums([])
    }).finally(() => {
      if (!cancelled) setLoadingEnums(false)
    })
    return () => { cancelled = true }
  }, [connectionId, state?.schema])

  const updateState = useCallback(
    (patch: Partial<TableDesignerState>) => {
      if (!state) return
      updateDesignerState(tabId, { ...state, ...patch })
    },
    [tabId, state, updateDesignerState]
  )

  const handleApply = useCallback(async () => {
    if (!state || !connectionId) return
    setApplying(true)
    setApplyResult(null)

    try {
      const sql =
        mode === 'alter' && tab?.designerOriginalState
          ? generateAlterTableSQL(tab.designerOriginalState, state)
          : generateCreateTableSQL(state)

      if (sql.startsWith('--')) {
        setApplyResult({ ok: false, message: sql })
        return
      }

      await invoke('query:execute', connectionId, sql)
      setApplyResult({ ok: true, message: mode === 'alter' ? 'Table altered successfully' : 'Table created successfully' })
    } catch (err) {
      setApplyResult({ ok: false, message: (err as Error).message })
    } finally {
      setApplying(false)
    }
  }, [state, connectionId, mode, tab?.designerOriginalState])

  if (!state || !tab) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#555560', fontSize: 13 }}>
        No designer state available
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Top bar — schema + table name */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12, padding: '8px 12px',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
        background: '#1C1C20',
        flexShrink: 0,
      }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 11, color: '#8B8B8B' }}>Schema</span>
          <input
            value={state.schema}
            onChange={(e) => updateState({ schema: e.target.value })}
            spellCheck={false}
            style={{
              width: 120, height: 26, padding: '0 8px',
              background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 4, color: '#ECECEC', fontSize: 12, fontFamily: 'inherit', outline: 'none',
            }}
          />
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1 }}>
          <span style={{ fontSize: 11, color: '#8B8B8B' }}>Table Name</span>
          <input
            value={state.tableName}
            onChange={(e) => updateState({ tableName: e.target.value })}
            placeholder="my_table"
            spellCheck={false}
            autoFocus
            style={{
              width: 240, height: 26, padding: '0 8px',
              background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 4, color: '#ECECEC', fontSize: 12, fontFamily: 'inherit', outline: 'none',
            }}
          />
        </label>
      </div>

      {/* Section tabs */}
      <div style={{
        display: 'flex', gap: 0, flexShrink: 0,
        borderBottom: '1px solid rgba(255,255,255,0.07)',
        background: '#131316',
      }}>
        {sectionTabs.map((st) => {
          const isActive = activeSection === st.key
          return (
            <button
              key={st.key}
              onClick={() => setActiveSection(st.key)}
              style={{
                padding: '6px 16px',
                fontSize: 11,
                fontWeight: isActive ? 600 : 400,
                color: isActive ? '#ECECEC' : '#555560',
                background: 'transparent',
                border: 'none',
                borderBottom: isActive ? '2px solid #5B8AF0' : '2px solid transparent',
                cursor: 'pointer',
                transition: 'color 0.12s',
              }}
              onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.color = '#8B8B8B' }}
              onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.color = '#555560' }}
            >
              {st.label}
            </button>
          )
        })}
      </div>

      {/* Section content */}
      <div style={{ flex: 1, overflow: 'hidden', minHeight: 0 }}>
        {activeSection === 'columns' && (
          <ColumnsEditor
            columns={state.columns}
            enumNames={[
              ...state.enums.filter((e) => e.name.trim()).map((e) => e.name),
              ...existingEnums.map((e) => e.name),
            ]}
            onChange={(columns) => updateState({ columns })}
          />
        )}
        {activeSection === 'indexes' && (
          <IndexesEditor
            indexes={state.indexes}
            columns={state.columns}
            onChange={(indexes) => updateState({ indexes })}
          />
        )}
        {activeSection === 'foreignKeys' && (
          <ForeignKeysEditor
            foreignKeys={state.foreignKeys}
            columns={state.columns}
            onChange={(foreignKeys) => updateState({ foreignKeys })}
          />
        )}
        {activeSection === 'enums' && (
          <EnumsEditor
            enums={state.enums}
            existingEnums={existingEnums}
            loadingExisting={loadingEnums}
            onChange={(enums) => updateState({ enums })}
          />
        )}
        {activeSection === 'sql' && (
          <SQLPreview
            state={state}
            originalState={tab.designerOriginalState}
            mode={mode}
          />
        )}
      </div>

      {/* Footer — apply button + result feedback */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px',
        borderTop: '1px solid rgba(255,255,255,0.07)',
        background: '#1C1C20',
        flexShrink: 0,
      }}>
        {applyResult && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6, flex: 1,
            fontSize: 11,
            color: applyResult.ok ? '#34D399' : '#F87171',
          }}>
            {applyResult.ok ? <Check size={12} /> : <AlertCircle size={12} />}
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{applyResult.message}</span>
          </div>
        )}
        {!applyResult && <div style={{ flex: 1 }} />}
        <button
          onClick={handleApply}
          disabled={applying || !connectionId}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '6px 16px',
            background: applying ? 'rgba(91,138,240,0.3)' : '#5B8AF0',
            color: '#fff',
            border: 'none',
            borderRadius: 5,
            fontSize: 12,
            fontWeight: 500,
            cursor: applying || !connectionId ? 'default' : 'pointer',
            opacity: !connectionId ? 0.4 : 1,
            transition: 'background 0.15s',
          }}
        >
          {applying && <Loader2 size={12} className="animate-spin" />}
          {mode === 'alter' ? 'Apply Changes' : 'Create Table'}
        </button>
      </div>
    </div>
  )
}
