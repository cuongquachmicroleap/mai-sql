import Database from 'better-sqlite3'
import { app } from 'electron'
import path from 'path'
import { nanoid } from 'nanoid'
import type { HistoryEntry } from '../../shared/types/history'

class HistoryManager {
  private db: Database.Database

  constructor() {
    const dbPath = path.join(app.getPath('userData'), 'query-history.db')
    this.db = new Database(dbPath)
    this.db.pragma('journal_mode = WAL')
    this.initialize()
  }

  private initialize(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS history (
        id TEXT PRIMARY KEY,
        connectionId TEXT,
        connectionName TEXT,
        database TEXT,
        sql TEXT,
        executedAt TEXT,
        executionTimeMs INTEGER,
        rowCount INTEGER,
        status TEXT,
        error TEXT,
        isFavorite INTEGER DEFAULT 0
      )
    `)
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_history_executedAt ON history (executedAt DESC)
    `)
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_history_connectionId ON history (connectionId)
    `)
  }

  add(entry: Omit<HistoryEntry, 'id' | 'isFavorite'>): HistoryEntry {
    const id = nanoid()
    const stmt = this.db.prepare(`
      INSERT INTO history (id, connectionId, connectionName, database, sql, executedAt, executionTimeMs, rowCount, status, error, isFavorite)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
    `)
    stmt.run(
      id,
      entry.connectionId,
      entry.connectionName,
      entry.database,
      entry.sql,
      entry.executedAt,
      entry.executionTimeMs,
      entry.rowCount,
      entry.status,
      entry.error ?? null,
    )
    return { ...entry, id, isFavorite: false }
  }

  list(connectionId?: string, limit = 200): HistoryEntry[] {
    if (connectionId) {
      const stmt = this.db.prepare(
        'SELECT * FROM history WHERE connectionId = ? ORDER BY executedAt DESC LIMIT ?',
      )
      return stmt.all(connectionId, limit).map(this.toEntry)
    }
    const stmt = this.db.prepare('SELECT * FROM history ORDER BY executedAt DESC LIMIT ?')
    return stmt.all(limit).map(this.toEntry)
  }

  search(query: string, connectionId?: string): HistoryEntry[] {
    const pattern = `%${query}%`
    if (connectionId) {
      const stmt = this.db.prepare(
        'SELECT * FROM history WHERE connectionId = ? AND sql LIKE ? ORDER BY executedAt DESC LIMIT 200',
      )
      return stmt.all(connectionId, pattern).map(this.toEntry)
    }
    const stmt = this.db.prepare(
      'SELECT * FROM history WHERE sql LIKE ? ORDER BY executedAt DESC LIMIT 200',
    )
    return stmt.all(pattern).map(this.toEntry)
  }

  toggleFavorite(id: string): void {
    const stmt = this.db.prepare(
      'UPDATE history SET isFavorite = CASE WHEN isFavorite = 1 THEN 0 ELSE 1 END WHERE id = ?',
    )
    stmt.run(id)
  }

  delete(id: string): void {
    const stmt = this.db.prepare('DELETE FROM history WHERE id = ?')
    stmt.run(id)
  }

  clear(connectionId?: string): void {
    if (connectionId) {
      const stmt = this.db.prepare('DELETE FROM history WHERE connectionId = ?')
      stmt.run(connectionId)
    } else {
      this.db.exec('DELETE FROM history')
    }
  }

  private toEntry(row: unknown): HistoryEntry {
    const r = row as Record<string, unknown>
    return {
      id: r.id as string,
      connectionId: r.connectionId as string,
      connectionName: r.connectionName as string,
      database: r.database as string,
      sql: r.sql as string,
      executedAt: r.executedAt as string,
      executionTimeMs: r.executionTimeMs as number,
      rowCount: r.rowCount as number,
      status: r.status as 'success' | 'error',
      error: r.error as string | undefined,
      isFavorite: (r.isFavorite as number) === 1,
    }
  }
}

export const historyManager = new HistoryManager()
