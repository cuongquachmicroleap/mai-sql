import { describe, it, expect, vi, beforeEach } from 'vitest'

const { handlers } = vi.hoisted(() => ({
  handlers: new Map<string, Function>(),
}))

vi.mock('electron', () => ({
  ipcMain: {
    handle: vi.fn((channel: string, handler: Function) => {
      handlers.set(channel, handler)
    }),
  },
  dialog: {
    showSaveDialog: vi.fn(),
    showOpenDialog: vi.fn(),
  },
}))

vi.mock('fs', () => ({
  default: {
    writeFileSync: vi.fn(),
    readFileSync: vi.fn(),
  },
}))

vi.mock('../../managers/connection-manager', () => ({
  connectionManager: {
    getDriver: vi.fn(),
  },
}))

import '../../ipc/backup'
import { connectionManager } from '../../managers/connection-manager'
import { dialog } from 'electron'
import fs from 'fs'

const fakeEvent = {} as Electron.IpcMainInvokeEvent

const mockDriver = { execute: vi.fn() }

describe('IPC backup handlers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ─── backup:choose-save-path ─────────────────────────────────────────────

  it('returns file path when not canceled', async () => {
    vi.mocked(dialog.showSaveDialog).mockResolvedValueOnce({
      canceled: false,
      filePath: '/tmp/backup.json',
    })
    const result = await handlers.get('backup:choose-save-path')!(fakeEvent, 'backup.json')
    expect(result).toBe('/tmp/backup.json')
  })

  it('returns null when save dialog is canceled', async () => {
    vi.mocked(dialog.showSaveDialog).mockResolvedValueOnce({ canceled: true })
    const result = await handlers.get('backup:choose-save-path')!(fakeEvent, 'backup.json')
    expect(result).toBeNull()
  })

  // ─── backup:choose-open-path ─────────────────────────────────────────────

  it('returns file path when file is selected', async () => {
    vi.mocked(dialog.showOpenDialog).mockResolvedValueOnce({
      canceled: false,
      filePaths: ['/tmp/backup.json'],
    })
    const result = await handlers.get('backup:choose-open-path')!(fakeEvent)
    expect(result).toBe('/tmp/backup.json')
  })

  it('returns null when open dialog is canceled', async () => {
    vi.mocked(dialog.showOpenDialog).mockResolvedValueOnce({ canceled: true, filePaths: [] })
    const result = await handlers.get('backup:choose-open-path')!(fakeEvent)
    expect(result).toBeNull()
  })

  it('returns null when filePaths is empty', async () => {
    vi.mocked(dialog.showOpenDialog).mockResolvedValueOnce({ canceled: false, filePaths: [] })
    const result = await handlers.get('backup:choose-open-path')!(fakeEvent)
    expect(result).toBeNull()
  })

  // ─── backup:export ───────────────────────────────────────────────────────

  it('exports tables and returns success with rowCount', async () => {
    vi.mocked(connectionManager.getDriver).mockReturnValue(mockDriver as any)
    mockDriver.execute.mockResolvedValueOnce({
      columns: [{ name: 'id', dataType: 'int4' }, { name: 'name', dataType: 'text' }],
      rows: [{ id: 1, name: 'Alice' }, { id: 2, name: 'Bob' }],
      rowCount: 2,
    })

    const result = await handlers.get('backup:export')!(
      fakeEvent, 'conn-1', 'mydb', ['users'], '/tmp/out.json',
    )

    expect(result).toEqual({ success: true, rowCount: 2 })
    expect(fs.writeFileSync).toHaveBeenCalledWith(
      '/tmp/out.json',
      expect.stringContaining('"database": "mydb"'),
      'utf-8',
    )
  })

  it('writes correct backup file structure', async () => {
    vi.mocked(connectionManager.getDriver).mockReturnValue(mockDriver as any)
    mockDriver.execute.mockResolvedValueOnce({
      columns: [{ name: 'id', dataType: 'int4' }],
      rows: [{ id: 1 }],
      rowCount: 1,
    })

    await handlers.get('backup:export')!(fakeEvent, 'conn-1', 'mydb', ['users'], '/tmp/out.json')

    const [, written] = vi.mocked(fs.writeFileSync).mock.calls[0] as [string, string, string]
    const parsed = JSON.parse(written)
    expect(parsed.version).toBe(1)
    expect(parsed.database).toBe('mydb')
    expect(parsed.tables).toHaveLength(1)
    expect(parsed.tables[0].name).toBe('users')
    expect(parsed.tables[0].columns).toEqual([{ name: 'id', type: 'int4' }])
    expect(parsed.tables[0].rows).toEqual([[1]])
  })

  it('returns failure when driver not connected', async () => {
    vi.mocked(connectionManager.getDriver).mockReturnValue(undefined)

    const result = await handlers.get('backup:export')!(
      fakeEvent, 'conn-1', 'mydb', ['users'], '/tmp/out.json',
    )

    expect(result).toEqual({ success: false, rowCount: 0, error: "Not connected to 'conn-1'" })
    expect(fs.writeFileSync).not.toHaveBeenCalled()
  })

  it('returns failure on driver error', async () => {
    vi.mocked(connectionManager.getDriver).mockReturnValue(mockDriver as any)
    mockDriver.execute.mockRejectedValueOnce(new Error('query failed'))

    const result = await handlers.get('backup:export')!(
      fakeEvent, 'conn-1', 'mydb', ['users'], '/tmp/out.json',
    )

    expect(result).toEqual({ success: false, rowCount: 0, error: 'query failed' })
  })

  // ─── backup:import ───────────────────────────────────────────────────────

  it('restores tables and returns tablesRestored count', async () => {
    vi.mocked(connectionManager.getDriver).mockReturnValue(mockDriver as any)
    mockDriver.execute.mockResolvedValue({ rows: [], columns: [], rowCount: 0 })

    const backupContent = JSON.stringify({
      version: 1,
      database: 'mydb',
      timestamp: new Date().toISOString(),
      tables: [
        {
          name: 'users',
          columns: [{ name: 'id', type: 'int4' }, { name: 'name', type: 'text' }],
          rows: [[1, 'Alice'], [2, 'Bob']],
        },
      ],
    })
    vi.mocked(fs.readFileSync).mockReturnValue(backupContent)

    const result = await handlers.get('backup:import')!(
      fakeEvent, 'conn-1', 'mydb', '/tmp/backup.json',
    )

    expect(result).toEqual({ success: true, tablesRestored: 1 })
    expect(mockDriver.execute).toHaveBeenCalledTimes(2)
  })

  it('skips tables with no rows and still counts them', async () => {
    vi.mocked(connectionManager.getDriver).mockReturnValue(mockDriver as any)

    const backupContent = JSON.stringify({
      version: 1,
      database: 'mydb',
      timestamp: new Date().toISOString(),
      tables: [{ name: 'empty_table', columns: [{ name: 'id', type: 'int4' }], rows: [] }],
    })
    vi.mocked(fs.readFileSync).mockReturnValue(backupContent)

    const result = await handlers.get('backup:import')!(
      fakeEvent, 'conn-1', 'mydb', '/tmp/backup.json',
    )

    expect(result).toEqual({ success: true, tablesRestored: 1 })
    expect(mockDriver.execute).not.toHaveBeenCalled()
  })

  it('returns failure for version != 1', async () => {
    vi.mocked(connectionManager.getDriver).mockReturnValue(mockDriver as any)
    vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify({ version: 2, tables: [] }))

    const result = await handlers.get('backup:import')!(
      fakeEvent, 'conn-1', 'mydb', '/tmp/backup.json',
    )

    expect(result).toEqual({ success: false, tablesRestored: 0, error: 'Invalid backup file format' })
  })

  it('returns failure when tables is not an array', async () => {
    vi.mocked(connectionManager.getDriver).mockReturnValue(mockDriver as any)
    vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify({ version: 1, tables: 'bad' }))

    const result = await handlers.get('backup:import')!(
      fakeEvent, 'conn-1', 'mydb', '/tmp/backup.json',
    )

    expect(result).toEqual({ success: false, tablesRestored: 0, error: 'Invalid backup file format' })
  })

  it('returns failure when driver not connected', async () => {
    vi.mocked(connectionManager.getDriver).mockReturnValue(undefined)

    const result = await handlers.get('backup:import')!(
      fakeEvent, 'conn-1', 'mydb', '/tmp/backup.json',
    )

    expect(result).toEqual({
      success: false,
      tablesRestored: 0,
      error: "Not connected to 'conn-1'",
    })
  })

  it('returns failure on file read error', async () => {
    vi.mocked(connectionManager.getDriver).mockReturnValue(mockDriver as any)
    vi.mocked(fs.readFileSync).mockImplementation(() => {
      throw new Error('file not found')
    })

    const result = await handlers.get('backup:import')!(
      fakeEvent, 'conn-1', 'mydb', '/tmp/missing.json',
    )

    expect(result).toEqual({ success: false, tablesRestored: 0, error: 'file not found' })
  })
})
