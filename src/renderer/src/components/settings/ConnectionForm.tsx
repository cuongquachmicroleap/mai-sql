import { useState } from 'react'
import { nanoid } from 'nanoid'
import { invoke } from '../../lib/ipc-client'
import { useConnectionStore } from '../../stores/connection-store'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog'
import type { ConnectionConfig, SQLDialect } from '@shared/types/connection'

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
  const { loadConnections } = useConnectionStore()

  const setField = (key: keyof ConnectionConfig, value: unknown) =>
    setForm((prev) => ({ ...prev, [key]: value }))

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
    }
    await invoke('connection:save', config)
    await loadConnections()
    setOpen(false)
    setForm({ type: 'postgresql', host: 'localhost', port: 5432, ssl: false })
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
