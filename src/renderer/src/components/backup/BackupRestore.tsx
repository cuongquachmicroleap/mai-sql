import { useState, useEffect } from 'react'
import { invoke } from '../../lib/ipc-client'
import { useConnectionStore } from '../../stores/connection-store'
import { FolderOpen, Download, Upload, AlertTriangle, CheckCircle, XCircle, Loader2 } from 'lucide-react'

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div
      className="rounded-lg p-4 space-y-3"
      style={{ background: 'var(--mai-bg-panel)', border: '1px solid var(--mai-border)' }}
    >
      <h3 className="text-sm font-semibold" style={{ color: 'var(--mai-text-1)' }}>
        {title}
      </h3>
      {children}
    </div>
  )
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <label className="block text-xs mb-1" style={{ color: 'var(--mai-text-2)' }}>
      {children}
    </label>
  )
}

function Select({
  value,
  onChange,
  children,
}: {
  value: string
  onChange: (v: string) => void
  children: React.ReactNode
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded px-2 py-1.5 text-sm outline-none"
      style={{
        background: 'var(--mai-bg-elevated)',
        border: '1px solid var(--mai-border)',
        color: 'var(--mai-text-1)',
      }}
    >
      {children}
    </select>
  )
}

function Input({
  value,
  onChange,
  placeholder,
  readOnly,
}: {
  value: string
  onChange?: (v: string) => void
  placeholder?: string
  readOnly?: boolean
}) {
  return (
    <input
      type="text"
      value={value}
      onChange={onChange ? (e) => onChange(e.target.value) : undefined}
      placeholder={placeholder}
      readOnly={readOnly}
      className="w-full rounded px-2 py-1.5 text-sm outline-none"
      style={{
        background: readOnly ? 'var(--mai-bg-panel)' : 'var(--mai-bg-elevated)',
        border: '1px solid var(--mai-border)',
        color: 'var(--mai-text-1)',
        cursor: readOnly ? 'default' : undefined,
      }}
    />
  )
}

function Button({
  onClick,
  disabled,
  variant = 'primary',
  children,
}: {
  onClick: () => void
  disabled?: boolean
  variant?: 'primary' | 'secondary' | 'danger'
  children: React.ReactNode
}) {
  const colors: Record<string, React.CSSProperties> = {
    primary: {
      background: disabled ? 'var(--mai-bg-elevated)' : 'var(--mai-accent)',
      color: '#fff',
    },
    secondary: {
      background: 'var(--mai-bg-panel)',
      border: '1px solid var(--mai-border)',
      color: 'var(--mai-text-1)',
    },
    danger: {
      background: disabled ? 'var(--mai-bg-elevated)' : '#dc2626',
      color: '#fff',
    },
  }

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="flex items-center gap-1.5 rounded px-3 py-1.5 text-xs font-medium transition-opacity disabled:opacity-50"
      style={colors[variant]}
    >
      {children}
    </button>
  )
}

type StatusMsg = { kind: 'success' | 'error'; text: string } | null

function StatusBanner({ status }: { status: StatusMsg }) {
  if (!status) return null
  const isOk = status.kind === 'success'
  return (
    <div
      className="flex items-start gap-2 rounded p-2 text-xs"
      style={{
        background: isOk ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
        border: `1px solid ${isOk ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`,
        color: isOk ? '#22c55e' : '#ef4444',
      }}
    >
      {isOk ? <CheckCircle size={13} className="mt-0.5 shrink-0" /> : <XCircle size={13} className="mt-0.5 shrink-0" />}
      <span>{status.text}</span>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Backup section
// ─────────────────────────────────────────────────────────────

function BackupSection() {
  const { connections, activeConnectionId } = useConnectionStore()
  const [connectionId, setConnectionId] = useState(activeConnectionId ?? '')
  const [database, setDatabase] = useState('')
  const [databases, setDatabases] = useState<string[]>([])
  const [tables, setTables] = useState<string[]>([])
  const [selectedTables, setSelectedTables] = useState<Set<string>>(new Set())
  const [outputPath, setOutputPath] = useState('')
  const [loading, setLoading] = useState(false)
  const [fetchingMeta, setFetchingMeta] = useState(false)
  const [progress, setProgress] = useState<string>('')
  const [status, setStatus] = useState<StatusMsg>(null)

  // Keep connectionId in sync when activeConnectionId changes
  useEffect(() => {
    if (activeConnectionId) setConnectionId(activeConnectionId)
  }, [activeConnectionId])

  // Load databases when connection changes
  useEffect(() => {
    if (!connectionId) {
      setDatabases([])
      setDatabase('')
      setTables([])
      setSelectedTables(new Set())
      return
    }
    setFetchingMeta(true)
    invoke('schema:databases', connectionId)
      .then((dbs) => {
        setDatabases(dbs)
        setDatabase(dbs[0] ?? '')
      })
      .catch(() => setDatabases([]))
      .finally(() => setFetchingMeta(false))
  }, [connectionId])

  // Load tables when database changes
  useEffect(() => {
    if (!connectionId || !database) {
      setTables([])
      setSelectedTables(new Set())
      return
    }
    setFetchingMeta(true)
    // Use 'public' schema as default; for SQLite it's just the db name
    invoke('schema:tables', connectionId, database)
      .then((tblInfos) => {
        const names = tblInfos.map((t) => t.name)
        setTables(names)
        setSelectedTables(new Set(names))
      })
      .catch(() => {
        setTables([])
        setSelectedTables(new Set())
      })
      .finally(() => setFetchingMeta(false))
  }, [connectionId, database])

  const toggleTable = (name: string) => {
    setSelectedTables((prev) => {
      const next = new Set(prev)
      if (next.has(name)) next.delete(name)
      else next.add(name)
      return next
    })
  }

  const toggleAll = () => {
    setSelectedTables((prev) =>
      prev.size === tables.length ? new Set() : new Set(tables),
    )
  }

  const choosePath = async () => {
    const defaultName = `backup-${database}-${new Date().toISOString().slice(0, 10)}.json`
    const path = await invoke('backup:choose-save-path', defaultName)
    if (path) setOutputPath(path)
  }

  const runExport = async () => {
    if (!connectionId || !database || selectedTables.size === 0 || !outputPath) return
    setLoading(true)
    setStatus(null)
    setProgress(`Exporting ${selectedTables.size} table(s)…`)
    try {
      const result = await invoke(
        'backup:export',
        connectionId,
        database,
        Array.from(selectedTables),
        outputPath,
      )
      if (result.success) {
        setStatus({ kind: 'success', text: `Exported ${result.rowCount} row(s) to ${outputPath}` })
      } else {
        setStatus({ kind: 'error', text: result.error ?? 'Unknown error' })
      }
    } catch (err) {
      setStatus({ kind: 'error', text: (err as Error).message })
    } finally {
      setLoading(false)
      setProgress('')
    }
  }

  const canExport = connectionId && database && selectedTables.size > 0 && outputPath && !loading

  return (
    <Section title="Backup — Export">
      <div>
        <Label>Connection</Label>
        <Select value={connectionId} onChange={setConnectionId}>
          <option value="">— select connection —</option>
          {connections.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
      </div>

      <div>
        <Label>Database</Label>
        {databases.length > 0 ? (
          <Select value={database} onChange={setDatabase}>
            {databases.map((db) => (
              <option key={db} value={db}>
                {db}
              </option>
            ))}
          </Select>
        ) : (
          <Input
            value={database}
            onChange={setDatabase}
            placeholder="database name"
          />
        )}
      </div>

      {/* Table selector */}
      {tables.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-1">
            <Label>Tables</Label>
            <button
              onClick={toggleAll}
              className="text-xs underline"
              style={{ color: 'var(--mai-accent)' }}
            >
              {selectedTables.size === tables.length ? 'Deselect all' : 'Select all'}
            </button>
          </div>
          <div
            className="max-h-36 overflow-y-auto rounded p-2 space-y-1"
            style={{ background: 'var(--mai-bg-elevated)', border: '1px solid var(--mai-border)' }}
          >
            {tables.map((t) => (
              <label key={t} className="flex items-center gap-2 text-xs cursor-pointer" style={{ color: 'var(--mai-text-1)' }}>
                <input
                  type="checkbox"
                  checked={selectedTables.has(t)}
                  onChange={() => toggleTable(t)}
                  className="accent-[var(--mai-accent)]"
                />
                {t}
              </label>
            ))}
          </div>
        </div>
      )}

      {fetchingMeta && (
        <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--mai-text-2)' }}>
          <Loader2 size={12} className="animate-spin" />
          Loading schema…
        </div>
      )}

      {/* Output path */}
      <div>
        <Label>Output file</Label>
        <div className="flex gap-2">
          <div className="flex-1">
            <Input value={outputPath} readOnly placeholder="Click Choose to pick location…" />
          </div>
          <Button variant="secondary" onClick={choosePath}>
            <FolderOpen size={13} />
            Choose
          </Button>
        </div>
      </div>

      {progress && (
        <div className="text-xs" style={{ color: 'var(--mai-text-2)' }}>
          {progress}
        </div>
      )}

      <StatusBanner status={status} />

      <div className="flex justify-end">
        <Button onClick={runExport} disabled={!canExport}>
          {loading ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
          Export
        </Button>
      </div>
    </Section>
  )
}

// ─────────────────────────────────────────────────────────────
// Restore section
// ─────────────────────────────────────────────────────────────

function RestoreSection() {
  const { connections, activeConnectionId } = useConnectionStore()
  const [connectionId, setConnectionId] = useState(activeConnectionId ?? '')
  const [database, setDatabase] = useState('')
  const [filePath, setFilePath] = useState('')
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState<StatusMsg>(null)

  useEffect(() => {
    if (activeConnectionId) setConnectionId(activeConnectionId)
  }, [activeConnectionId])

  const chooseFile = async () => {
    const path = await invoke('backup:choose-open-path')
    if (path) setFilePath(path)
  }

  const runImport = async () => {
    if (!connectionId || !filePath) return
    setLoading(true)
    setStatus(null)
    try {
      const result = await invoke('backup:import', connectionId, database, filePath)
      if (result.success) {
        setStatus({
          kind: 'success',
          text: `Restored ${result.tablesRestored} table(s) successfully`,
        })
      } else {
        setStatus({ kind: 'error', text: result.error ?? 'Unknown error' })
      }
    } catch (err) {
      setStatus({ kind: 'error', text: (err as Error).message })
    } finally {
      setLoading(false)
    }
  }

  const canImport = connectionId && filePath && !loading

  return (
    <Section title="Restore — Import">
      <div>
        <Label>Connection</Label>
        <Select value={connectionId} onChange={setConnectionId}>
          <option value="">— select connection —</option>
          {connections.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
      </div>

      <div>
        <Label>Target database (optional override)</Label>
        <Input
          value={database}
          onChange={setDatabase}
          placeholder="Leave blank to use database from backup file"
        />
      </div>

      {/* File picker */}
      <div>
        <Label>Backup file (.json)</Label>
        <div className="flex gap-2">
          <div className="flex-1">
            <Input value={filePath} readOnly placeholder="Click Choose to pick backup file…" />
          </div>
          <Button variant="secondary" onClick={chooseFile}>
            <FolderOpen size={13} />
            Choose
          </Button>
        </div>
      </div>

      {/* Warning */}
      <div
        className="flex items-start gap-2 rounded p-2 text-xs"
        style={{
          background: 'rgba(234,179,8,0.08)',
          border: '1px solid rgba(234,179,8,0.3)',
          color: '#ca8a04',
        }}
      >
        <AlertTriangle size={13} className="mt-0.5 shrink-0" />
        <span>
          <strong>Warning:</strong> This will INSERT rows into existing tables. It will NOT delete
          existing data first. Duplicate primary keys will cause errors.
        </span>
      </div>

      <StatusBanner status={status} />

      <div className="flex justify-end">
        <Button variant="danger" onClick={runImport} disabled={!canImport}>
          {loading ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}
          Restore
        </Button>
      </div>
    </Section>
  )
}

// ─────────────────────────────────────────────────────────────
// Root panel
// ─────────────────────────────────────────────────────────────

export function BackupRestore() {
  return (
    <div className="flex flex-col h-full overflow-y-auto p-4 space-y-4" style={{ background: 'var(--mai-bg-base)' }}>
      <div>
        <h2 className="text-sm font-bold tracking-wide" style={{ color: 'var(--mai-text-1)' }}>
          Backup &amp; Restore
        </h2>
        <p className="text-xs mt-0.5" style={{ color: 'var(--mai-text-2)' }}>
          Export tables to a JSON backup file or restore data from a previous export.
        </p>
      </div>

      <BackupSection />
      <RestoreSection />
    </div>
  )
}
