import { useState, useEffect, useCallback } from 'react'
import {
  GitCompare, Loader2, AlertCircle, Plus, Minus, Edit3, Copy,
  ArrowRight, CheckCircle2, Server, Database, Layers, FileCode,
  Table2, ArrowRightLeft,
} from 'lucide-react'
import { invoke } from '../../lib/ipc-client'
import { useConnectionStore } from '../../stores/connection-store'
import type { SchemaDiffResult, TableDiff } from '@shared/types/diff'

// ── Shared styles ────────────────────────────────────────────────────────────

const selectBase: React.CSSProperties = {
  width: '100%',
  height: 30,
  background: '#18181B',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: 6,
  padding: '0 10px',
  color: '#ECECEC',
  fontSize: 12,
  outline: 'none',
  cursor: 'pointer',
  transition: 'border-color 0.15s',
}

// ── ConnectionCard ───────────────────────────────────────────────────────────

function ConnectionCard({
  side,
  accentColor,
  connectionId,
  database,
  schema,
  onConnectionChange,
  onDatabaseChange,
  onSchemaChange,
}: {
  side: 'source' | 'target'
  accentColor: string
  connectionId: string
  database: string
  schema: string
  onConnectionChange: (id: string) => void
  onDatabaseChange: (db: string) => void
  onSchemaChange: (s: string) => void
}) {
  const { connections } = useConnectionStore()
  const [databases, setDatabases] = useState<string[]>([])
  const [schemas, setSchemas] = useState<string[]>([])
  const [dbHasSchemas, setDbHasSchemas] = useState(true)
  const [loadingDbs, setLoadingDbs] = useState(false)
  const [loadingSchemas, setLoadingSchemas] = useState(false)

  const loadDatabases = useCallback(async (connId: string) => {
    if (!connId) { setDatabases([]); setSchemas([]); return }
    setLoadingDbs(true)
    try {
      const [dbs, supportsSchemas] = await Promise.all([
        invoke('schema:databases', connId),
        invoke('schema:supports-schemas', connId),
      ])
      setDbHasSchemas(supportsSchemas)
      setDatabases(dbs)
      if (dbs.length > 0) {
        const defDb = await invoke('schema:default-database', connId)
        onDatabaseChange(dbs.includes(defDb) ? defDb : dbs[0])
      }
      // For non-schema databases, auto-set schema to 'default'
      if (!supportsSchemas) {
        onSchemaChange('default')
      }
    } catch { setDatabases([]) }
    finally { setLoadingDbs(false) }
  }, [onDatabaseChange, onSchemaChange])

  const loadSchemas = useCallback(async (connId: string, db: string) => {
    if (!connId || !db || !dbHasSchemas) { return }
    setLoadingSchemas(true)
    try {
      let list = await invoke('schema:schemas', connId, db)
      if (list.length === 0) list = ['public']
      setSchemas(list)
      onSchemaChange(list.includes('public') ? 'public' : list[0])
    } catch { setSchemas([]) }
    finally { setLoadingSchemas(false) }
  }, [onSchemaChange, dbHasSchemas])

  useEffect(() => { if (connectionId) loadDatabases(connectionId) }, [connectionId, loadDatabases])
  useEffect(() => { if (connectionId && database && dbHasSchemas) loadSchemas(connectionId, database) }, [connectionId, database, dbHasSchemas, loadSchemas])

  const conn = connections.find((c) => c.id === connectionId)
  const isReady = connectionId && database && schema

  return (
    <div
      style={{
        flex: 1,
        background: '#18181B',
        borderRadius: 10,
        border: `1px solid ${isReady ? accentColor + '30' : 'rgba(255,255,255,0.06)'}`,
        overflow: 'hidden',
        transition: 'border-color 0.2s',
      }}
    >
      {/* Card header */}
      <div
        className="flex items-center gap-2"
        style={{
          height: 34,
          padding: '0 14px',
          background: accentColor + '08',
          borderBottom: `1px solid ${accentColor}15`,
        }}
      >
        <span
          style={{
            width: 7,
            height: 7,
            borderRadius: '50%',
            background: isReady ? accentColor : '#3A3A45',
            flexShrink: 0,
            transition: 'background 0.2s',
          }}
        />
        <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.04em', color: accentColor, textTransform: 'uppercase' }}>
          {side}
        </span>
        {/* Breadcrumb summary */}
        {isReady && (
          <span style={{ fontSize: 10, color: '#555560', marginLeft: 'auto' }}>
            {conn?.name} / {database} / {schema}
          </span>
        )}
      </div>

      {/* Card body */}
      <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {/* Connection */}
        <FieldRow icon={<Server size={11} />} label="Connection">
          <select
            value={connectionId}
            onChange={(e) => { onConnectionChange(e.target.value); onDatabaseChange(''); onSchemaChange('') }}
            style={selectBase}
          >
            <option value="">Choose connection...</option>
            {connections.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}{c.group ? ` [${c.group}]` : ''}
              </option>
            ))}
          </select>
        </FieldRow>

        {/* Database */}
        <FieldRow icon={<Database size={11} />} label="Database">
          <select
            value={database}
            onChange={(e) => { onDatabaseChange(e.target.value); onSchemaChange('') }}
            disabled={!connectionId || loadingDbs}
            style={{ ...selectBase, opacity: connectionId ? 1 : 0.35 }}
          >
            <option value="">
              {loadingDbs ? 'Loading databases...' : connectionId ? 'Choose database...' : '--'}
            </option>
            {databases.map((db) => <option key={db} value={db}>{db}</option>)}
          </select>
        </FieldRow>

        {/* Schema — only for databases that support schemas */}
        {dbHasSchemas && (
          <FieldRow icon={<Layers size={11} />} label="Schema">
            <select
              value={schema}
              onChange={(e) => onSchemaChange(e.target.value)}
              disabled={!database || loadingSchemas}
              style={{ ...selectBase, opacity: database ? 1 : 0.35 }}
            >
              <option value="">
                {loadingSchemas ? 'Loading schemas...' : database ? 'Choose schema...' : '--'}
              </option>
              {schemas.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </FieldRow>
        )}
      </div>
    </div>
  )
}

function FieldRow({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-1.5" style={{ marginBottom: 4 }}>
        <span style={{ color: '#555560' }}>{icon}</span>
        <span style={{ fontSize: 10, fontWeight: 500, color: '#555560' }}>{label}</span>
      </div>
      {children}
    </div>
  )
}

// ── Main SchemaDiff ──────────────────────────────────────────────────────────

export function SchemaDiff() {
  const { activeConnectionId } = useConnectionStore()
  const [sourceId, setSourceId] = useState(activeConnectionId ?? '')
  const [sourceDb, setSourceDb] = useState('')
  const [sourceSchema, setSourceSchema] = useState('')
  const [targetId, setTargetId] = useState('')
  const [targetDb, setTargetDb] = useState('')
  const [targetSchema, setTargetSchema] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<SchemaDiffResult | null>(null)
  const [migrationSQL, setMigrationSQL] = useState<string | null>(null)
  const [selectedTable, setSelectedTable] = useState<TableDiff | null>(null)
  const [hoveredTable, setHoveredTable] = useState<string | null>(null)

  const canCompare = !!(sourceId && sourceDb && sourceSchema && targetId && targetDb && targetSchema && !loading)

  const handleCompare = async () => {
    if (!canCompare) return
    setLoading(true); setError(null); setResult(null); setMigrationSQL(null); setSelectedTable(null)
    try {
      const diff = await invoke('diff:compare', sourceId, targetId, sourceSchema, targetSchema, sourceDb, targetDb)
      setResult(diff)
    } catch (err) { setError((err as Error).message) }
    finally { setLoading(false) }
  }

  const handleGenerateMigration = async () => {
    if (!result) return
    try {
      const sql = await invoke('diff:generate-migration', result, sourceId, sourceSchema, sourceDb)
      setMigrationSQL(sql)
    } catch (err) { setError((err as Error).message) }
  }

  const totalChanges = result
    ? result.addedTables.length + result.removedTables.length + result.modifiedTables.length
    : 0
  const hasChanges = totalChanges > 0

  return (
    <div className="flex flex-col h-full" style={{ background: '#111113' }}>
      {/* ── Header bar ── */}
      <div
        className="flex items-center gap-2 px-4 shrink-0"
        style={{
          height: 38,
          borderBottom: '1px solid rgba(255,255,255,0.07)',
          background: '#1C1C20',
        }}
      >
        <GitCompare size={14} style={{ color: '#5B8AF0' }} />
        <span style={{ fontSize: 12, fontWeight: 600, color: '#ECECEC' }}>Schema Diff</span>
        <div className="flex-1" />
        {result && (
          <span style={{ fontSize: 11, color: '#555560' }}>
            {totalChanges === 0 ? 'No differences' : `${totalChanges} difference${totalChanges > 1 ? 's' : ''}`}
          </span>
        )}
      </div>

      {/* ── Picker area ── */}
      <div
        className="shrink-0"
        style={{
          padding: '16px 20px',
          borderBottom: '1px solid rgba(255,255,255,0.07)',
          background: '#131316',
        }}
      >
        <div className="flex items-stretch gap-4">
          {/* Source card */}
          <ConnectionCard
            side="source"
            accentColor="#5B8AF0"
            connectionId={sourceId}
            database={sourceDb}
            schema={sourceSchema}
            onConnectionChange={setSourceId}
            onDatabaseChange={setSourceDb}
            onSchemaChange={setSourceSchema}
          />

          {/* Center compare button */}
          <div className="flex flex-col items-center justify-center gap-2" style={{ minWidth: 60 }}>
            <button
              onClick={handleCompare}
              disabled={!canCompare}
              title="Compare schemas"
              style={{
                width: 44,
                height: 44,
                borderRadius: '50%',
                border: 'none',
                background: canCompare ? '#5B8AF0' : '#222227',
                color: canCompare ? '#fff' : '#3A3A45',
                cursor: canCompare ? 'pointer' : 'default',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'background 0.2s, color 0.2s, transform 0.15s',
                boxShadow: canCompare ? '0 4px 20px rgba(91,138,240,0.25)' : 'none',
              }}
              onMouseEnter={(e) => { if (canCompare) e.currentTarget.style.transform = 'scale(1.08)' }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)' }}
            >
              {loading
                ? <Loader2 size={18} className="animate-spin" />
                : <ArrowRightLeft size={18} />
              }
            </button>
            <span style={{ fontSize: 9, color: '#3A3A45', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Compare
            </span>
          </div>

          {/* Target card */}
          <ConnectionCard
            side="target"
            accentColor="#34D399"
            connectionId={targetId}
            database={targetDb}
            schema={targetSchema}
            onConnectionChange={setTargetId}
            onDatabaseChange={setTargetDb}
            onSchemaChange={setTargetSchema}
          />
        </div>
      </div>

      {/* ── Error banner ── */}
      {error && (
        <div
          className="flex items-center gap-2 px-4 py-2 shrink-0"
          style={{ background: 'rgba(248,113,113,0.06)', color: '#F87171', fontSize: 12, borderBottom: '1px solid rgba(248,113,113,0.1)' }}
        >
          <AlertCircle size={12} className="shrink-0" />
          <span className="truncate">{error}</span>
        </div>
      )}

      {/* ── Results ── */}
      {result && (
        <div className="flex flex-1 overflow-hidden min-h-0">
          {/* Left sidebar — table list */}
          <div
            className="shrink-0 flex flex-col overflow-hidden"
            style={{ width: 280, borderRight: '1px solid rgba(255,255,255,0.07)', background: '#18181B' }}
          >
            {/* Summary bar */}
            <div
              className="flex items-center gap-3 px-3 shrink-0"
              style={{ height: 34, borderBottom: '1px solid rgba(255,255,255,0.07)', background: '#1C1C20' }}
            >
              <StatBadge color="#34D399" count={result.addedTables.length} label="added" />
              <StatBadge color="#F87171" count={result.removedTables.length} label="removed" />
              <StatBadge color="#FBBF24" count={result.modifiedTables.length} label="modified" />
            </div>

            {/* Scrollable list */}
            <div className="flex-1 overflow-y-auto py-1">
              {!hasChanges && (
                <div className="flex flex-col items-center justify-center py-10" style={{ color: '#555560' }}>
                  <CheckCircle2 size={24} style={{ opacity: 0.3, marginBottom: 8 }} />
                  <span style={{ fontSize: 12 }}>Schemas are identical</span>
                </div>
              )}

              {result.addedTables.length > 0 && (
                <SectionHeader label={`Added (${result.addedTables.length})`} color="#34D399" />
              )}
              {result.addedTables.map((t) => (
                <TableRow key={`a-${t}`} name={t} icon={<Plus size={10} />} color="#34D399" />
              ))}

              {result.removedTables.length > 0 && (
                <SectionHeader label={`Removed (${result.removedTables.length})`} color="#F87171" />
              )}
              {result.removedTables.map((t) => (
                <TableRow key={`r-${t}`} name={t} icon={<Minus size={10} />} color="#F87171" strikethrough />
              ))}

              {result.modifiedTables.length > 0 && (
                <SectionHeader label={`Modified (${result.modifiedTables.length})`} color="#FBBF24" />
              )}
              {result.modifiedTables.map((t) => {
                const changeCount = t.addedColumns.length + t.removedColumns.length + t.modifiedColumns.length
                const isSelected = selectedTable?.tableName === t.tableName
                const isHovered = hoveredTable === t.tableName
                return (
                  <button
                    key={`m-${t.tableName}`}
                    onClick={() => setSelectedTable(t)}
                    onMouseEnter={() => setHoveredTable(t.tableName)}
                    onMouseLeave={() => setHoveredTable(null)}
                    className="flex items-center gap-2 w-full"
                    style={{
                      height: 30,
                      paddingLeft: 14,
                      paddingRight: 10,
                      border: 'none',
                      cursor: 'pointer',
                      textAlign: 'left',
                      background: isSelected
                        ? 'rgba(251,191,36,0.08)'
                        : isHovered
                          ? 'rgba(255,255,255,0.03)'
                          : 'transparent',
                      borderLeft: isSelected ? '2px solid #FBBF24' : '2px solid transparent',
                      transition: 'background 0.1s',
                    }}
                  >
                    <Table2 size={11} style={{ color: '#FBBF24', flexShrink: 0 }} />
                    <span className="truncate" style={{ fontSize: 12, color: isSelected ? '#ECECEC' : '#8B8B8B' }}>
                      {t.tableName}
                    </span>
                    <span
                      className="ml-auto shrink-0"
                      style={{
                        fontSize: 9,
                        padding: '1px 5px',
                        borderRadius: 8,
                        background: 'rgba(251,191,36,0.1)',
                        color: '#FBBF24',
                      }}
                    >
                      {changeCount}
                    </span>
                  </button>
                )
              })}
            </div>

            {/* Generate migration button */}
            {hasChanges && (
              <div className="shrink-0 px-3 py-2" style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
                <button
                  onClick={handleGenerateMigration}
                  className="flex items-center justify-center gap-1.5 w-full"
                  style={{
                    height: 30,
                    borderRadius: 6,
                    border: '1px solid rgba(91,138,240,0.3)',
                    background: 'rgba(91,138,240,0.06)',
                    color: '#5B8AF0',
                    cursor: 'pointer',
                    fontSize: 11,
                    fontWeight: 500,
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(91,138,240,0.12)' }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(91,138,240,0.06)' }}
                >
                  <FileCode size={11} />
                  Generate Migration
                </button>
              </div>
            )}
          </div>

          {/* Right detail panel */}
          <div className="flex-1 overflow-auto" style={{ background: '#111113' }}>
            {selectedTable ? (
              <div style={{ padding: 20, maxWidth: 640 }}>
                {/* Table header */}
                <div className="flex items-center gap-2" style={{ marginBottom: 16 }}>
                  <Table2 size={16} style={{ color: '#FBBF24' }} />
                  <h3 style={{ fontSize: 15, fontWeight: 600, color: '#ECECEC', margin: 0 }}>
                    {selectedTable.tableName}
                  </h3>
                </div>

                {/* Change groups as cards */}
                {selectedTable.addedColumns.length > 0 && (
                  <ChangeCard title="Added Columns" color="#34D399" icon={<Plus size={10} />}>
                    {selectedTable.addedColumns.map((c) => (
                      <div key={c} className="flex items-center gap-2" style={{ height: 26 }}>
                        <Plus size={9} style={{ color: '#34D399', flexShrink: 0 }} />
                        <span style={{ fontSize: 12, color: '#ECECEC' }}>{c}</span>
                      </div>
                    ))}
                  </ChangeCard>
                )}

                {selectedTable.removedColumns.length > 0 && (
                  <ChangeCard title="Removed Columns" color="#F87171" icon={<Minus size={10} />}>
                    {selectedTable.removedColumns.map((c) => (
                      <div key={c} className="flex items-center gap-2" style={{ height: 26 }}>
                        <Minus size={9} style={{ color: '#F87171', flexShrink: 0 }} />
                        <span style={{ fontSize: 12, color: '#8B8B8B', textDecoration: 'line-through' }}>{c}</span>
                      </div>
                    ))}
                  </ChangeCard>
                )}

                {selectedTable.modifiedColumns.length > 0 && (
                  <ChangeCard title="Modified Columns" color="#FBBF24" icon={<Edit3 size={10} />}>
                    {selectedTable.modifiedColumns.map((c) => (
                      <div key={c.name} style={{ padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                        <span style={{ fontSize: 12, color: '#ECECEC', fontWeight: 500 }}>{c.name}</span>
                        {c.changes.map((change, i) => (
                          <div key={i} className="flex items-center gap-1.5 mt-1" style={{ paddingLeft: 12 }}>
                            <ArrowRight size={8} style={{ color: '#555560' }} />
                            <span style={{ fontSize: 11, color: '#8B8B8B', fontFamily: "ui-monospace, 'SF Mono', monospace" }}>
                              {change}
                            </span>
                          </div>
                        ))}
                      </div>
                    ))}
                  </ChangeCard>
                )}

                {(selectedTable.addedIndexes.length > 0 || selectedTable.removedIndexes.length > 0) && (
                  <ChangeCard title="Index Changes" color="#A78BFA" icon={<Layers size={10} />}>
                    {selectedTable.addedIndexes.map((idx) => (
                      <div key={idx} className="flex items-center gap-2" style={{ height: 26 }}>
                        <Plus size={9} style={{ color: '#34D399', flexShrink: 0 }} />
                        <span style={{ fontSize: 12, color: '#ECECEC' }}>{idx}</span>
                      </div>
                    ))}
                    {selectedTable.removedIndexes.map((idx) => (
                      <div key={idx} className="flex items-center gap-2" style={{ height: 26 }}>
                        <Minus size={9} style={{ color: '#F87171', flexShrink: 0 }} />
                        <span style={{ fontSize: 12, color: '#8B8B8B', textDecoration: 'line-through' }}>{idx}</span>
                      </div>
                    ))}
                  </ChangeCard>
                )}
              </div>

            ) : migrationSQL ? (
              <div style={{ padding: 20 }}>
                <div className="flex items-center justify-between" style={{ marginBottom: 12 }}>
                  <div className="flex items-center gap-2">
                    <FileCode size={14} style={{ color: '#5B8AF0' }} />
                    <h3 style={{ fontSize: 14, fontWeight: 600, color: '#ECECEC', margin: 0 }}>Migration SQL</h3>
                  </div>
                  <button
                    onClick={() => navigator.clipboard.writeText(migrationSQL).catch(() => {})}
                    className="flex items-center gap-1.5"
                    style={{
                      fontSize: 11,
                      color: '#5B8AF0',
                      background: 'rgba(91,138,240,0.08)',
                      border: '1px solid rgba(91,138,240,0.2)',
                      borderRadius: 5,
                      padding: '4px 10px',
                      cursor: 'pointer',
                      transition: 'background 0.12s',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(91,138,240,0.15)' }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(91,138,240,0.08)' }}
                  >
                    <Copy size={10} />
                    Copy to clipboard
                  </button>
                </div>
                <pre style={{
                  fontSize: 12,
                  lineHeight: 1.6,
                  color: '#ECECEC',
                  fontFamily: "ui-monospace, 'SF Mono', 'Cascadia Code', monospace",
                  whiteSpace: 'pre-wrap',
                  background: '#18181B',
                  borderRadius: 8,
                  padding: 16,
                  border: '1px solid rgba(255,255,255,0.06)',
                  margin: 0,
                }}>
                  {migrationSQL}
                </pre>
              </div>

            ) : (
              <div className="flex flex-col items-center justify-center h-full" style={{ color: '#3A3A45' }}>
                {hasChanges ? (
                  <>
                    <ArrowRight size={28} style={{ opacity: 0.2, marginBottom: 10 }} />
                    <span style={{ fontSize: 12, color: '#555560' }}>Select a table to view changes</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={28} style={{ opacity: 0.2, marginBottom: 10 }} />
                    <span style={{ fontSize: 12, color: '#555560' }}>Schemas are identical</span>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Empty state (before compare) ── */}
      {!result && !loading && !error && (
        <div className="flex flex-1 items-center justify-center">
          <div className="text-center" style={{ maxWidth: 280 }}>
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: 14,
                background: 'rgba(91,138,240,0.06)',
                border: '1px solid rgba(91,138,240,0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px',
              }}
            >
              <GitCompare size={24} style={{ color: '#5B8AF0', opacity: 0.5 }} />
            </div>
            <p style={{ fontSize: 13, color: '#8B8B8B', margin: '0 0 6px' }}>
              Compare database schemas
            </p>
            <p style={{ fontSize: 11, color: '#3A3A45', margin: 0, lineHeight: 1.5 }}>
              Select a source and target connection above, pick the database and schema, then click the compare button
            </p>
          </div>
        </div>
      )}

      {/* Loading state */}
      {loading && !result && (
        <div className="flex flex-1 items-center justify-center">
          <div className="flex flex-col items-center gap-3" style={{ color: '#555560' }}>
            <Loader2 size={24} className="animate-spin" style={{ color: '#5B8AF0' }} />
            <span style={{ fontSize: 12 }}>Comparing schemas...</span>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Small helper components ──────────────────────────────────────────────────

function StatBadge({ color, count, label }: { color: string; count: number; label: string }) {
  return (
    <span className="flex items-center gap-1" style={{ fontSize: 10 }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: color, display: 'inline-block' }} />
      <span style={{ color, fontWeight: 600 }}>{count}</span>
      <span style={{ color: '#3A3A45' }}>{label}</span>
    </span>
  )
}

function SectionHeader({ label, color }: { label: string; color: string }) {
  return (
    <div
      className="flex items-center gap-1.5"
      style={{
        height: 24,
        padding: '0 14px',
        marginTop: 6,
        fontSize: 9,
        fontWeight: 600,
        letterSpacing: '0.06em',
        textTransform: 'uppercase',
        color,
      }}
    >
      {label}
    </div>
  )
}

function TableRow({ name, icon, color, strikethrough }: { name: string; icon: React.ReactNode; color: string; strikethrough?: boolean }) {
  const [hovered, setHovered] = useState(false)
  return (
    <div
      className="flex items-center gap-2"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        height: 28,
        paddingLeft: 14,
        paddingRight: 10,
        background: hovered ? 'rgba(255,255,255,0.02)' : 'transparent',
        transition: 'background 0.1s',
      }}
    >
      <span style={{ color, flexShrink: 0 }}>{icon}</span>
      <span
        className="truncate"
        style={{
          fontSize: 12,
          color: hovered ? '#ECECEC' : '#8B8B8B',
          textDecoration: strikethrough ? 'line-through' : undefined,
        }}
      >
        {name}
      </span>
    </div>
  )
}

function ChangeCard({
  title,
  color,
  icon,
  children,
}: {
  title: string
  color: string
  icon: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div
      style={{
        background: '#18181B',
        borderRadius: 8,
        border: '1px solid rgba(255,255,255,0.06)',
        marginBottom: 12,
        overflow: 'hidden',
      }}
    >
      {/* Card header */}
      <div
        className="flex items-center gap-1.5"
        style={{
          height: 30,
          padding: '0 12px',
          background: color + '08',
          borderBottom: `1px solid ${color}15`,
        }}
      >
        <span style={{ color }}>{icon}</span>
        <span style={{ fontSize: 11, fontWeight: 600, color }}>{title}</span>
      </div>
      {/* Card body */}
      <div style={{ padding: '6px 12px' }}>
        {children}
      </div>
    </div>
  )
}
