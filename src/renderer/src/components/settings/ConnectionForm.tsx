import { useState, useEffect } from 'react'
import { nanoid } from 'nanoid'
import { ChevronDown, ChevronRight, Plus } from 'lucide-react'
import { invoke } from '../../lib/ipc-client'
import { useConnectionStore } from '../../stores/connection-store'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog'
import type { ConnectionConfig, SQLDialect, SSHTunnelConfig, SavedConnection } from '@shared/types/connection'

const DIALECT_DEFAULTS: Record<SQLDialect, { port: number; label: string }> = {
  postgresql: { port: 5432, label: 'PostgreSQL' },
  mysql: { port: 3306, label: 'MySQL' },
  mariadb: { port: 3306, label: 'MariaDB' },
  mongodb: { port: 27017, label: 'MongoDB' },
  clickhouse: { port: 8123, label: 'ClickHouse' },
  mssql: { port: 1433, label: 'SQL Server' },
}

interface ConnectionFormProps {
  initialConnection?: SavedConnection | null
  onClose?: () => void
}

// Shared input style
const INPUT_STYLE: React.CSSProperties = {
  height: 34,
  background: '#222227',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: 6,
  padding: '0 10px',
  fontSize: 13,
  color: '#ECECEC',
  width: '100%',
  outline: 'none',
  fontFamily: 'inherit',
  transition: 'border-color 0.15s',
}

const LABEL_STYLE: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 500,
  color: '#8B8B8B',
  display: 'block',
  marginBottom: 4,
}

function FormInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  const [focused, setFocused] = useState(false)
  return (
    <input
      {...props}
      style={{
        ...INPUT_STYLE,
        borderColor: focused ? '#5B8AF0' : 'rgba(255,255,255,0.08)',
        ...props.style,
      }}
      onFocus={(e) => { setFocused(true); props.onFocus?.(e) }}
      onBlur={(e) => { setFocused(false); props.onBlur?.(e) }}
    />
  )
}

function FormSelect(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  const [focused, setFocused] = useState(false)
  return (
    <select
      {...props}
      style={{
        ...INPUT_STYLE,
        borderColor: focused ? '#5B8AF0' : 'rgba(255,255,255,0.08)',
        appearance: 'none',
        cursor: 'pointer',
        ...props.style,
      }}
      onFocus={(e) => { setFocused(true); props.onFocus?.(e) }}
      onBlur={(e) => { setFocused(false); props.onBlur?.(e) }}
    />
  )
}

export function ConnectionForm({ initialConnection, onClose }: ConnectionFormProps) {
  const isEditing = !!initialConnection

  const [open, setOpen] = useState(isEditing)
  const [form, setForm] = useState<Partial<ConnectionConfig>>({
    type: 'postgresql', host: 'localhost', port: 5432, ssl: false
  })
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ success: boolean; error?: string } | null>(null)
  const [advancedOpen, setAdvancedOpen] = useState(false)
  const [sshEnabled, setSshEnabled] = useState(false)
  const [btnNewHovered, setBtnNewHovered] = useState(false)
  const { loadConnections } = useConnectionStore()

  useEffect(() => {
    if (initialConnection) {
      setOpen(true)
      setForm({
        id: initialConnection.id,
        type: initialConnection.type,
        name: initialConnection.name,
        host: initialConnection.host,
        port: initialConnection.port,
        database: initialConnection.database,
        username: initialConnection.username,
        ssl: initialConnection.ssl,
        sshTunnel: initialConnection.sshTunnel,
        color: initialConnection.color,
        group: initialConnection.group,
      })
      setSshEnabled(!!initialConnection.sshTunnel)
      setAdvancedOpen(!!initialConnection.ssl || !!initialConnection.sshTunnel)
    } else {
      setOpen(false)
      setForm({ type: 'postgresql', host: 'localhost', port: 5432, ssl: false })
      setSshEnabled(false)
      setAdvancedOpen(false)
    }
    setTestResult(null)
  }, [initialConnection])

  const setField = (key: keyof ConnectionConfig, value: unknown) =>
    setForm((prev) => ({ ...prev, [key]: value }))

  const setSshField = (key: keyof SSHTunnelConfig, value: unknown) =>
    setForm((prev) => ({
      ...prev,
      sshTunnel: { host: '', port: 22, username: '', ...prev.sshTunnel, [key]: value },
    }))

  const handleTest = async () => {
    setTesting(true)
    setTestResult(null)
    try {
      const result = await invoke('connection:test', form as ConnectionConfig)
      setTestResult(result)
    } catch (err) {
      setTestResult({ success: false, error: (err as Error).message })
    } finally {
      setTesting(false)
    }
  }

  const handleClose = () => {
    setOpen(false)
    setTestResult(null)
    if (!isEditing) {
      setForm({ type: 'postgresql', host: 'localhost', port: 5432, ssl: false })
      setSshEnabled(false)
      setAdvancedOpen(false)
    }
    onClose?.()
  }

  const handleSave = async () => {
    if (!form.host || !form.username) return
    if (!isEditing && !form.password) return
    const config: ConnectionConfig = {
      id: form.id ?? nanoid(),
      name: form.name || (form.database ? `${form.host}/${form.database}` : form.host),
      type: form.type as SQLDialect,
      host: form.host,
      port: form.port ?? DIALECT_DEFAULTS[form.type as SQLDialect].port,
      database: form.database || undefined,
      username: form.username,
      password: form.password ?? '',
      ssl: form.ssl,
      sshTunnel: sshEnabled ? form.sshTunnel : undefined,
      color: form.color,
      group: form.group,
    }
    await invoke('connection:save', config)
    await loadConnections()
    handleClose()
  }

  const canSave = !!form.host && !!form.username && (isEditing || !!form.password)
  const canTest = !!form.host && !!form.username && !!form.password

  return (
    <>
      {!isEditing && (
        <button
          onClick={() => setOpen(true)}
          onMouseEnter={() => setBtnNewHovered(true)}
          onMouseLeave={() => setBtnNewHovered(false)}
          style={{
            width: '100%',
            height: 30,
            background: btnNewHovered ? '#2A2A30' : '#222227',
            border: '1px solid rgba(255,255,255,0.10)',
            borderRadius: 6,
            color: '#8B8B8B',
            fontSize: 12,
            fontWeight: 500,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            transition: 'background 0.15s, color 0.15s',
          }}
        >
          <Plus size={13} />
          New Connection
        </button>
      )}
      <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose() }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {isEditing ? 'Edit Connection' : 'New Connection'}
            </DialogTitle>
          </DialogHeader>

          <div style={{ display: 'grid', gap: 14, paddingTop: 8 }}>
            {/* Database Type */}
            <div>
              <label style={LABEL_STYLE}>Database Type</label>
              <FormSelect
                value={form.type}
                onChange={(e) => {
                  const type = e.target.value as SQLDialect
                  setField('type', type)
                  setField('port', DIALECT_DEFAULTS[type].port)
                }}
              >
                {(Object.entries(DIALECT_DEFAULTS) as [SQLDialect, { port: number; label: string }][]).map(([k, v]) => (
                  <option key={k} value={k} style={{ background: '#222227', color: '#ECECEC' }}>{v.label}</option>
                ))}
              </FormSelect>
            </div>

            {/* Name */}
            <div>
              <label style={LABEL_STYLE}>Name (optional)</label>
              <FormInput
                placeholder="My Database"
                value={form.name ?? ''}
                onChange={(e) => setField('name', e.target.value)}
              />
            </div>

            {/* Group + Color */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 8 }}>
              <div>
                <label style={LABEL_STYLE}>Group (optional)</label>
                <FormInput
                  placeholder="Production, Staging, Dev..."
                  value={form.group ?? ''}
                  onChange={(e) => setField('group', e.target.value)}
                  list="connection-groups"
                />
                <datalist id="connection-groups">
                  <option value="Production" />
                  <option value="Staging" />
                  <option value="Development" />
                  <option value="Testing" />
                </datalist>
              </div>
              <div>
                <label style={LABEL_STYLE}>Color</label>
                <div className="flex items-center gap-1" style={{ height: 34 }}>
                  {['#34D399', '#5B8AF0', '#FBBF24', '#F97316', '#EF4444', '#A78BFA'].map((color) => (
                    <button
                      key={color}
                      onClick={() => setField('color', form.color === color ? undefined : color)}
                      style={{
                        width: 20,
                        height: 20,
                        borderRadius: '50%',
                        background: color,
                        border: form.color === color ? '2px solid #ECECEC' : '2px solid transparent',
                        cursor: 'pointer',
                        padding: 0,
                        transition: 'border-color 0.12s',
                      }}
                      title={color}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Host + Port */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 8 }}>
              <div>
                <label style={LABEL_STYLE}>Host</label>
                <FormInput
                  value={form.host ?? ''}
                  onChange={(e) => setField('host', e.target.value)}
                />
              </div>
              <div>
                <label style={LABEL_STYLE}>Port</label>
                <FormInput
                  type="number"
                  value={form.port ?? ''}
                  onChange={(e) => setField('port', Number(e.target.value))}
                />
              </div>
            </div>

            {/* Database */}
            <div>
              <label style={LABEL_STYLE}>
                Database
                <span style={{ fontWeight: 400, color: '#555560', marginLeft: 4 }}>(optional)</span>
              </label>
              <FormInput
                placeholder="postgres"
                value={form.database ?? ''}
                onChange={(e) => setField('database', e.target.value)}
              />
            </div>

            {/* Username + Password */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <div>
                <label style={LABEL_STYLE}>Username</label>
                <FormInput
                  value={form.username ?? ''}
                  onChange={(e) => setField('username', e.target.value)}
                />
              </div>
              <div>
                <label style={LABEL_STYLE}>
                  Password
                  {isEditing && (
                    <span style={{ fontWeight: 400, color: '#555560', marginLeft: 4 }}>(required)</span>
                  )}
                </label>
                <FormInput
                  type="password"
                  placeholder={isEditing ? 'Enter password to save' : ''}
                  value={form.password ?? ''}
                  onChange={(e) => setField('password', e.target.value)}
                />
              </div>
            </div>

            {/* Advanced section */}
            <div style={{
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 6,
              overflow: 'hidden',
            }}>
              <button
                type="button"
                onClick={() => setAdvancedOpen((v) => !v)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  width: '100%',
                  padding: '6px 12px',
                  fontSize: 12,
                  fontWeight: 500,
                  color: '#8B8B8B',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'color 0.12s',
                }}
                onMouseEnter={(e) => e.currentTarget.style.color = '#ECECEC'}
                onMouseLeave={(e) => e.currentTarget.style.color = '#8B8B8B'}
              >
                {advancedOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                Advanced
              </button>
              {advancedOpen && (
                <div style={{
                  padding: '8px 12px 12px',
                  borderTop: '1px solid rgba(255,255,255,0.08)',
                  display: 'grid',
                  gap: 10,
                }}>
                  {/* SSL toggle */}
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', userSelect: 'none' }}>
                    <input
                      type="checkbox"
                      checked={!!form.ssl}
                      onChange={(e) => setField('ssl', e.target.checked)}
                      style={{ width: 14, height: 14, accentColor: '#5B8AF0' }}
                    />
                    <span style={{ fontSize: 12, color: '#8B8B8B' }}>Use SSL/TLS</span>
                  </label>

                  {/* SSH Tunnel toggle */}
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', userSelect: 'none' }}>
                    <input
                      type="checkbox"
                      checked={sshEnabled}
                      onChange={(e) => setSshEnabled(e.target.checked)}
                      style={{ width: 14, height: 14, accentColor: '#5B8AF0' }}
                    />
                    <span style={{ fontSize: 12, color: '#8B8B8B' }}>Use SSH Tunnel</span>
                  </label>

                  {sshEnabled && (
                    <div style={{ paddingLeft: 20, display: 'grid', gap: 10 }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 8 }}>
                        <div>
                          <label style={LABEL_STYLE}>SSH Host</label>
                          <FormInput
                            type="text"
                            placeholder="bastion.example.com"
                            value={form.sshTunnel?.host ?? ''}
                            onChange={(e) => setSshField('host', e.target.value)}
                          />
                        </div>
                        <div>
                          <label style={LABEL_STYLE}>SSH Port</label>
                          <FormInput
                            type="number"
                            value={form.sshTunnel?.port ?? 22}
                            onChange={(e) => setSshField('port', Number(e.target.value))}
                          />
                        </div>
                      </div>
                      <div>
                        <label style={LABEL_STYLE}>SSH Username</label>
                        <FormInput
                          type="text"
                          placeholder="ubuntu"
                          value={form.sshTunnel?.username ?? ''}
                          onChange={(e) => setSshField('username', e.target.value)}
                        />
                      </div>
                      <div>
                        <label style={LABEL_STYLE}>
                          SSH Private Key Path
                          <span style={{ fontWeight: 400, color: '#555560', marginLeft: 4 }}>(optional)</span>
                        </label>
                        <FormInput
                          type="text"
                          placeholder="~/.ssh/id_rsa"
                          value={form.sshTunnel?.privateKey ?? ''}
                          onChange={(e) => setSshField('privateKey', e.target.value)}
                        />
                      </div>
                      <div>
                        <label style={LABEL_STYLE}>
                          SSH Password
                          <span style={{ fontWeight: 400, color: '#555560', marginLeft: 4 }}>(optional)</span>
                        </label>
                        <FormInput
                          type="password"
                          placeholder="Leave blank for key-based auth"
                          value={form.sshTunnel?.password ?? ''}
                          onChange={(e) => setSshField('password', e.target.value)}
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Test result */}
            {testResult && (
              <p style={{
                fontSize: 12,
                color: testResult.success ? '#34D399' : '#F87171',
                margin: 0,
              }}>
                {testResult.success ? '✓ Connection successful' : `✗ ${testResult.error}`}
              </p>
            )}

            {/* Actions */}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', alignItems: 'center' }}>
              {isEditing && !form.password && (
                <span style={{ fontSize: 12, color: '#555560', marginRight: 'auto' }}>
                  Enter password to test
                </span>
              )}
              {/* Test button — outline style */}
              <OutlineButton onClick={handleTest} disabled={testing || !canTest}>
                {testing ? 'Testing...' : 'Test Connection'}
              </OutlineButton>
              {/* Save button — accent */}
              <PrimaryButton onClick={handleSave} disabled={!canSave}>
                {isEditing ? 'Save Changes' : 'Save'}
              </PrimaryButton>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

function OutlineButton({ onClick, disabled, children }: {
  onClick: () => void
  disabled?: boolean
  children: React.ReactNode
}) {
  const [hovered, setHovered] = useState(false)
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        height: 32,
        padding: '0 12px',
        fontSize: 12,
        fontWeight: 500,
        background: hovered && !disabled ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.12)',
        borderRadius: 6,
        color: disabled ? '#555560' : '#8B8B8B',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        transition: 'background 0.15s, color 0.15s',
      }}
    >
      {children}
    </button>
  )
}

function PrimaryButton({ onClick, disabled, children }: {
  onClick: () => void
  disabled?: boolean
  children: React.ReactNode
}) {
  const [hovered, setHovered] = useState(false)
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        height: 32,
        padding: '0 14px',
        fontSize: 12,
        fontWeight: 500,
        background: disabled ? '#3A3A45' : hovered ? '#4A7AE0' : '#5B8AF0',
        border: 'none',
        borderRadius: 6,
        color: '#ffffff',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        transition: 'background 0.15s',
      }}
    >
      {children}
    </button>
  )
}
