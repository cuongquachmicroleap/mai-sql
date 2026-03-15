import { useState } from 'react'
import { nanoid } from 'nanoid'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { invoke } from '../../lib/ipc-client'
import { useConnectionStore } from '../../stores/connection-store'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog'
import type { ConnectionConfig, SQLDialect, SSHTunnelConfig } from '@shared/types/connection'

const DIALECT_DEFAULTS: Record<SQLDialect, { port: number; label: string }> = {
  postgresql: { port: 5432, label: 'PostgreSQL' },
  mysql: { port: 3306, label: 'MySQL' },
  mariadb: { port: 3306, label: 'MariaDB' },
  mongodb: { port: 27017, label: 'MongoDB' },
  clickhouse: { port: 8123, label: 'ClickHouse' },
  mssql: { port: 1433, label: 'SQL Server' },
}

export function ConnectionForm() {
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<Partial<ConnectionConfig>>({
    type: 'postgresql', host: 'localhost', port: 5432, ssl: false
  })
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ success: boolean; error?: string } | null>(null)
  const [advancedOpen, setAdvancedOpen] = useState(false)
  const [sshEnabled, setSshEnabled] = useState(false)
  const { loadConnections } = useConnectionStore()

  const setField = (key: keyof ConnectionConfig, value: unknown) =>
    setForm((prev) => ({ ...prev, [key]: value }))

  const setSshField = (key: keyof SSHTunnelConfig, value: unknown) =>
    setForm((prev) => ({
      ...prev,
      sshTunnel: { host: '', port: 22, username: '', ...prev.sshTunnel, [key]: value },
    }))

  const handleTest = async () => {
    if (!form.host || !form.database || !form.username || !form.password) return
    setTesting(true)
    setTestResult(null)
    const result = await invoke('connection:test', form as ConnectionConfig)
    setTestResult(result)
    setTesting(false)
  }

  const handleSave = async () => {
    if (!form.host || !form.database || !form.username || !form.password) return
    const config: ConnectionConfig = {
      id: form.id ?? nanoid(),
      name: form.name || `${form.host}/${form.database}`,
      type: form.type as SQLDialect,
      host: form.host,
      port: form.port ?? DIALECT_DEFAULTS[form.type as SQLDialect].port,
      database: form.database,
      username: form.username,
      password: form.password,
      ssl: form.ssl,
      sshTunnel: sshEnabled ? form.sshTunnel : undefined,
    }
    await invoke('connection:save', config)
    await loadConnections()
    setOpen(false)
    setForm({ type: 'postgresql', host: 'localhost', port: 5432, ssl: false })
    setSshEnabled(false)
    setAdvancedOpen(false)
    setTestResult(null)
  }

  return (
    <>
      <Button size="sm" className="w-full" onClick={() => setOpen(true)}>+ New Connection</Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>New Connection</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-1.5">
              <Label>Database Type</Label>
              <select
                value={form.type}
                onChange={(e) => {
                  const type = e.target.value as SQLDialect
                  setField('type', type)
                  setField('port', DIALECT_DEFAULTS[type].port)
                }}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
              >
                {(Object.entries(DIALECT_DEFAULTS) as [SQLDialect, { port: number; label: string }][]).map(([k, v]) => (
                  <option key={k} value={k}>{v.label}</option>
                ))}
              </select>
            </div>
            <div className="grid gap-1.5">
              <Label>Name (optional)</Label>
              <Input placeholder="My Database" value={form.name ?? ''} onChange={(e) => setField('name', e.target.value)} />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-2 grid gap-1.5">
                <Label>Host</Label>
                <Input value={form.host ?? ''} onChange={(e) => setField('host', e.target.value)} />
              </div>
              <div className="grid gap-1.5">
                <Label>Port</Label>
                <Input type="number" value={form.port ?? ''} onChange={(e) => setField('port', Number(e.target.value))} />
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label>Database</Label>
              <Input value={form.database ?? ''} onChange={(e) => setField('database', e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="grid gap-1.5">
                <Label>Username</Label>
                <Input value={form.username ?? ''} onChange={(e) => setField('username', e.target.value)} />
              </div>
              <div className="grid gap-1.5">
                <Label>Password</Label>
                <Input type="password" value={form.password ?? ''} onChange={(e) => setField('password', e.target.value)} />
              </div>
            </div>
            {/* Advanced section */}
            <div className="border border-[var(--color-border)] rounded-md overflow-hidden">
              <button
                type="button"
                onClick={() => setAdvancedOpen((v) => !v)}
                className="flex items-center gap-2 w-full px-3 py-2 text-xs font-medium text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] hover:bg-[var(--color-accent)] transition-colors"
              >
                {advancedOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                Advanced
              </button>
              {advancedOpen && (
                <div className="px-3 pb-3 grid gap-3 border-t border-[var(--color-border)]">
                  {/* SSL toggle */}
                  <label className="flex items-center gap-2 pt-3 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={!!form.ssl}
                      onChange={(e) => setField('ssl', e.target.checked)}
                      className="accent-[var(--color-primary)] w-3.5 h-3.5"
                    />
                    <span className="text-xs font-medium text-[var(--color-muted-foreground)]">Use SSL/TLS</span>
                  </label>

                  {/* SSH Tunnel toggle */}
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={sshEnabled}
                      onChange={(e) => setSshEnabled(e.target.checked)}
                      className="accent-[var(--color-primary)] w-3.5 h-3.5"
                    />
                    <span className="text-xs font-medium text-[var(--color-muted-foreground)]">Use SSH Tunnel</span>
                  </label>

                  {/* SSH Tunnel fields */}
                  {sshEnabled && (
                    <div className="grid gap-3 pl-5">
                      <div className="grid grid-cols-3 gap-2">
                        <div className="col-span-2 grid gap-1.5">
                          <label className="text-xs font-medium text-[var(--color-muted-foreground)]">SSH Host</label>
                          <input
                            type="text"
                            placeholder="bastion.example.com"
                            value={form.sshTunnel?.host ?? ''}
                            onChange={(e) => setSshField('host', e.target.value)}
                            className="bg-[var(--color-input)] border border-[var(--color-border)] rounded text-xs px-2 py-1.5 text-[var(--color-foreground)] w-full outline-none focus:ring-1 focus:ring-[var(--color-ring)]"
                          />
                        </div>
                        <div className="grid gap-1.5">
                          <label className="text-xs font-medium text-[var(--color-muted-foreground)]">SSH Port</label>
                          <input
                            type="number"
                            value={form.sshTunnel?.port ?? 22}
                            onChange={(e) => setSshField('port', Number(e.target.value))}
                            className="bg-[var(--color-input)] border border-[var(--color-border)] rounded text-xs px-2 py-1.5 text-[var(--color-foreground)] w-full outline-none focus:ring-1 focus:ring-[var(--color-ring)]"
                          />
                        </div>
                      </div>
                      <div className="grid gap-1.5">
                        <label className="text-xs font-medium text-[var(--color-muted-foreground)]">SSH Username</label>
                        <input
                          type="text"
                          placeholder="ubuntu"
                          value={form.sshTunnel?.username ?? ''}
                          onChange={(e) => setSshField('username', e.target.value)}
                          className="bg-[var(--color-input)] border border-[var(--color-border)] rounded text-xs px-2 py-1.5 text-[var(--color-foreground)] w-full outline-none focus:ring-1 focus:ring-[var(--color-ring)]"
                        />
                      </div>
                      <div className="grid gap-1.5">
                        <label className="text-xs font-medium text-[var(--color-muted-foreground)]">SSH Private Key Path <span className="text-[var(--color-muted-foreground)] font-normal">(optional)</span></label>
                        <input
                          type="text"
                          placeholder="~/.ssh/id_rsa"
                          value={form.sshTunnel?.privateKey ?? ''}
                          onChange={(e) => setSshField('privateKey', e.target.value)}
                          className="bg-[var(--color-input)] border border-[var(--color-border)] rounded text-xs px-2 py-1.5 text-[var(--color-foreground)] w-full outline-none focus:ring-1 focus:ring-[var(--color-ring)]"
                        />
                      </div>
                      <div className="grid gap-1.5">
                        <label className="text-xs font-medium text-[var(--color-muted-foreground)]">SSH Password <span className="text-[var(--color-muted-foreground)] font-normal">(optional)</span></label>
                        <input
                          type="password"
                          placeholder="Leave blank for key-based auth"
                          value={form.sshTunnel?.password ?? ''}
                          onChange={(e) => setSshField('password', e.target.value)}
                          className="bg-[var(--color-input)] border border-[var(--color-border)] rounded text-xs px-2 py-1.5 text-[var(--color-foreground)] w-full outline-none focus:ring-1 focus:ring-[var(--color-ring)]"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {testResult && (
              <p className={`text-xs ${testResult.success ? 'text-green-500' : 'text-destructive'}`}>
                {testResult.success ? '✓ Connection successful' : `✗ ${testResult.error}`}
              </p>
            )}
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={handleTest} disabled={testing || !form.host || !form.password}>
                {testing ? 'Testing...' : 'Test Connection'}
              </Button>
              <Button onClick={handleSave} disabled={!form.host || !form.database || !form.username || !form.password}>
                Save
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
