# Sprint 1: Foundation — "Connect and Query" Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bootstrap the Electron app with PostgreSQL connectivity, Monaco SQL editor, virtual-scroll results grid, schema explorer sidebar, and i18n — producing a working "connect and query" desktop app.

**Architecture:** Electron 35+ with Vite (electron-vite) hosts a Node.js main process handling all DB connections and IPC, and a React 19 renderer for UI. All DB calls flow through a type-safe contextBridge IPC layer. No separate server — everything runs in-process.

**Tech Stack:** Electron 35, electron-vite, React 19, TypeScript 5, TailwindCSS 4, shadcn/ui, Zustand 5, Monaco Editor, TanStack Table + Virtual, `pg` (PostgreSQL), electron-keytar, react-i18next, Vitest, Playwright.

---

## Chunk 1: Project Scaffolding & Build Config

### Task 1: Initialize Project with electron-vite

**Files:**
- Create: `package.json`
- Create: `electron.vite.config.ts`
- Create: `tsconfig.json`
- Create: `tsconfig.node.json`
- Create: `tsconfig.web.json`
- Create: `.eslintrc.cjs`
- Create: `.prettierrc`
- Create: `.gitignore`

- [ ] **Step 1: Initialize package.json**

```bash
cd /Users/cuongquachc/Projects/microleap/mai-sql
npm create @quick-start/electron mai-sql -- --template react-ts
# If the above isn't available, scaffold manually:
npm init -y
```

Then set `package.json` to:

```json
{
  "name": "mai-sql",
  "version": "0.1.0",
  "description": "AI-native multi-database SQL client",
  "main": "out/main/index.js",
  "homepage": "https://github.com/microleap/mai-sql",
  "license": "MIT",
  "scripts": {
    "dev": "electron-vite dev",
    "build": "electron-vite build",
    "preview": "electron-vite preview",
    "lint": "eslint . --ext .ts,.tsx",
    "format": "prettier --write .",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:e2e": "playwright test"
  },
  "dependencies": {
    "electron-updater": "^6.3.0"
  },
  "devDependencies": {
    "@electron-toolkit/tsconfig": "^1.0.1",
    "electron": "^35.0.0",
    "electron-builder": "^25.0.0",
    "electron-vite": "^2.3.0",
    "vite": "^5.0.0",
    "@vitejs/plugin-react": "^4.0.0",
    "typescript": "^5.4.0",
    "vitest": "^1.6.0",
    "@playwright/test": "^1.44.0"
  }
}
```

- [ ] **Step 2: Install core dev dependencies**

```bash
npm install --save-dev electron@35 electron-vite vite @vitejs/plugin-react typescript electron-builder
```

- [ ] **Step 3: Create electron.vite.config.ts**

```typescript
// electron.vite.config.ts
import { resolve } from 'path'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    build: {
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'src/main/index.ts')
        }
      }
    }
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: {
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'src/preload/index.ts')
        }
      }
    }
  },
  renderer: {
    resolve: {
      alias: {
        '@renderer': resolve('src/renderer/src'),
        '@shared': resolve('src/shared')
      }
    },
    plugins: [react()]
  }
})
```

- [ ] **Step 4: Create tsconfig.json (root)**

```json
{
  "files": [],
  "references": [
    { "path": "./tsconfig.node.json" },
    { "path": "./tsconfig.web.json" }
  ]
}
```

- [ ] **Step 5: Create tsconfig.node.json (main + preload)**

```json
{
  "extends": "@electron-toolkit/tsconfig/tsconfig.node.json",
  "include": ["electron.vite.config.*", "src/main/**/*", "src/preload/**/*"],
  "compilerOptions": {
    "composite": true,
    "types": ["electron-vite/node"],
    "paths": {
      "@shared/*": ["./src/shared/*"]
    }
  }
}
```

- [ ] **Step 6: Create tsconfig.web.json (renderer)**

```json
{
  "extends": "@electron-toolkit/tsconfig/tsconfig.web.json",
  "include": ["src/renderer/src/**/*"],
  "compilerOptions": {
    "composite": true,
    "baseUrl": ".",
    "paths": {
      "@renderer/*": ["./src/renderer/src/*"],
      "@shared/*": ["./src/shared/*"]
    }
  }
}
```

- [ ] **Step 7: Create .eslintrc.cjs**

```js
// .eslintrc.cjs
module.exports = {
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react-hooks/recommended'
  ],
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint'],
  root: true,
  env: { node: true, browser: true, es2022: true },
  rules: {
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }]
  }
}
```

- [ ] **Step 8: Create .prettierrc**

```json
{
  "semi": false,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "es5",
  "printWidth": 100
}
```

- [ ] **Step 9: Create .gitignore**

```
node_modules/
out/
dist/
.DS_Store
*.log
```

- [ ] **Step 10: Install @electron-toolkit/tsconfig**

```bash
npm install --save-dev @electron-toolkit/tsconfig
```

- [ ] **Step 11: Commit scaffolding**

```bash
git init
git add .
git commit -m "chore: initialize electron-vite project scaffold"
```

---

### Task 2: Install All Sprint 1 Dependencies

**Files:**
- Modify: `package.json` (dependencies section)

- [ ] **Step 1: Install production dependencies**

```bash
# Database
npm install pg

# AI (Sprint 1 only needs connection layer, but install all for the interface)
# Skip AI SDKs for Sprint 1 — added in Sprint 3

# Security
npm install electron-keytar

# Storage
npm install better-sqlite3 electron-store

# UI
npm install react react-dom @monaco-editor/react
npm install @tanstack/react-table @tanstack/react-virtual
npm install zustand react-i18next i18next

# Electron runtime helpers
npm install electron-updater
```

- [ ] **Step 2: Install dev dependencies**

```bash
npm install --save-dev \
  @types/node @types/react @types/react-dom @types/pg @types/better-sqlite3 \
  tailwindcss @tailwindcss/vite postcss autoprefixer \
  eslint @typescript-eslint/parser @typescript-eslint/eslint-plugin \
  eslint-plugin-react-hooks \
  prettier \
  vitest @vitest/coverage-v8 \
  @playwright/test
```

- [ ] **Step 3: Initialize Tailwind**

```bash
npx tailwindcss init -p
```

Update `tailwind.config.ts`:

```typescript
import type { Config } from 'tailwindcss'

export default {
  content: ['./src/renderer/src/**/*.{ts,tsx}', './src/renderer/index.html'],
  darkMode: 'class',
  theme: { extend: {} },
  plugins: []
} satisfies Config
```

- [ ] **Step 4: Install shadcn/ui**

```bash
npx shadcn@latest init
# Choose: TypeScript, Default style, Slate base color, src/renderer/src/components/ui
```

- [ ] **Step 5: Commit dependencies**

```bash
git add package.json package-lock.json tailwind.config.ts
git commit -m "chore: install all sprint 1 dependencies"
```

---

## Chunk 2: Shared Types & IPC Contract

### Task 3: Define Shared Types

**Files:**
- Create: `src/shared/types/connection.ts`
- Create: `src/shared/types/query.ts`
- Create: `src/shared/types/schema.ts`
- Create: `src/shared/types/ipc.ts`
- Create: `src/shared/index.ts`

These types are imported by both main and renderer — the contract that keeps them in sync.

- [ ] **Step 1: Write tests for type shapes (type-level tests)**

```typescript
// src/shared/types/__tests__/connection.test.ts
import { describe, it, expectTypeOf } from 'vitest'
import type { ConnectionConfig, SQLDialect } from '../connection'

describe('ConnectionConfig types', () => {
  it('SQLDialect includes all 6 supported databases', () => {
    const dialects: SQLDialect[] = ['postgresql', 'mysql', 'mariadb', 'mongodb', 'clickhouse', 'mssql']
    expectTypeOf(dialects).toEqualTypeOf<SQLDialect[]>()
  })

  it('ConnectionConfig has required fields', () => {
    const config: ConnectionConfig = {
      id: 'test-id',
      name: 'Test DB',
      type: 'postgresql',
      host: 'localhost',
      port: 5432,
      database: 'testdb',
      username: 'user',
      password: 'pass'
    }
    expectTypeOf(config).toMatchTypeOf<ConnectionConfig>()
  })
})
```

- [ ] **Step 2: Run test to verify it fails (no types yet)**

```bash
npx vitest run src/shared/types/__tests__/connection.test.ts
```
Expected: FAIL — "Cannot find module '../connection'"

- [ ] **Step 3: Create connection.ts**

```typescript
// src/shared/types/connection.ts
export type SQLDialect = 'postgresql' | 'mysql' | 'mariadb' | 'mongodb' | 'clickhouse' | 'mssql'

export interface SSHTunnelConfig {
  host: string
  port: number
  username: string
  privateKey?: string
  password?: string
}

export interface ConnectionConfig {
  id: string
  name: string
  type: SQLDialect
  host: string
  port: number
  database: string
  username: string
  password: string // retrieved from OS keychain at runtime; stored here only in-memory
  ssl?: boolean
  sshTunnel?: SSHTunnelConfig
}

export interface SavedConnection extends Omit<ConnectionConfig, 'password'> {
  // Password is never serialized — fetched from keychain on connect
  createdAt: string
  lastConnectedAt?: string
}
```

- [ ] **Step 4: Create query.ts**

```typescript
// src/shared/types/query.ts
export interface ColumnMeta {
  name: string
  dataType: string
  nullable?: boolean
}

export interface QueryResult {
  columns: ColumnMeta[]
  rows: Record<string, unknown>[]
  rowCount: number
  affectedRows?: number
  executionTimeMs: number
  warnings?: string[]
  queryId: string
}

export interface QueryError {
  message: string
  code?: string
  line?: number
  position?: number
}
```

- [ ] **Step 5: Create schema.ts**

```typescript
// src/shared/types/schema.ts
export interface TableInfo {
  name: string
  schema: string
  type: 'table' | 'view' | 'materialized_view'
  rowCount?: number
  comment?: string
}

export interface ColumnInfo {
  name: string
  type: string
  nullable: boolean
  defaultValue?: string
  isPrimaryKey: boolean
  isForeignKey: boolean
  comment?: string
}

export interface Relationship {
  sourceTable: string
  sourceColumn: string
  targetTable: string
  targetColumn: string
  constraintName: string
}

export interface IndexInfo {
  name: string
  columns: string[]
  isUnique: boolean
  isPrimary: boolean
}

export interface SchemaContext {
  dialect: string
  tables: Array<{ table: TableInfo; columns: ColumnInfo[] }>
  relationships: Relationship[]
}
```

- [ ] **Step 6: Create ipc.ts — the contract between main and renderer**

```typescript
// src/shared/types/ipc.ts
import type { ConnectionConfig, SavedConnection } from './connection'
import type { QueryResult } from './query'
import type { TableInfo, ColumnInfo, Relationship } from './schema'

// All IPC channels are typed here. contextBridge enforces this at runtime.
export interface IPCChannels {
  // Connection management
  'connection:list': () => Promise<SavedConnection[]>
  'connection:save': (config: ConnectionConfig) => Promise<void>
  'connection:delete': (id: string) => Promise<void>
  'connection:test': (config: ConnectionConfig) => Promise<{ success: boolean; error?: string }>
  'connection:connect': (id: string) => Promise<void>
  'connection:disconnect': (id: string) => Promise<void>

  // Query execution
  'query:execute': (connectionId: string, sql: string) => Promise<QueryResult>
  'query:cancel': (queryId: string) => Promise<void>

  // Schema introspection
  'schema:databases': (connectionId: string) => Promise<string[]>
  'schema:schemas': (connectionId: string, database: string) => Promise<string[]>
  'schema:tables': (connectionId: string, schema: string) => Promise<TableInfo[]>
  'schema:columns': (connectionId: string, table: string) => Promise<ColumnInfo[]>
  'schema:relationships': (connectionId: string, schema: string) => Promise<Relationship[]>
}

// Helper to make IPC calls type-safe in the renderer
export type IPCInvoker = {
  [K in keyof IPCChannels]: IPCChannels[K]
}
```

- [ ] **Step 7: Create shared/index.ts barrel**

```typescript
// src/shared/index.ts
export * from './types/connection'
export * from './types/query'
export * from './types/schema'
export * from './types/ipc'
```

- [ ] **Step 8: Run tests to verify they pass**

```bash
npx vitest run src/shared/types/__tests__/connection.test.ts
```
Expected: PASS

- [ ] **Step 9: Commit shared types**

```bash
git add src/shared/
git commit -m "feat: add shared type definitions for IPC contract"
```

---

## Chunk 3: Main Process — Entry & IPC Architecture

### Task 4: Electron Main Process Entry

**Files:**
- Create: `src/main/index.ts`
- Create: `src/preload/index.ts`
- Create: `src/renderer/index.html`
- Create: `src/renderer/src/main.tsx`
- Create: `src/renderer/src/App.tsx`
- Create: `src/renderer/src/assets/index.css` (TailwindCSS)

- [ ] **Step 1: Create main process entry**

```typescript
// src/main/index.ts
import { app, shell, BrowserWindow } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'

function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.microleap.mai-sql')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  createWindow()

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// IPC handlers are registered in separate files — imported here
import './ipc/connections'
import './ipc/queries'
import './ipc/schema'
```

- [ ] **Step 2: Install @electron-toolkit/utils**

```bash
npm install @electron-toolkit/utils
```

- [ ] **Step 3: Create preload script**

The preload script is the **security boundary** — it exposes only what the renderer explicitly needs.

```typescript
// src/preload/index.ts
import { contextBridge, ipcRenderer } from 'electron'
import type { IPCChannels } from '../shared/types/ipc'

// Type-safe IPC invoker exposed to renderer via window.api
const api: IPCChannels = {
  // Connections
  'connection:list': () => ipcRenderer.invoke('connection:list'),
  'connection:save': (config) => ipcRenderer.invoke('connection:save', config),
  'connection:delete': (id) => ipcRenderer.invoke('connection:delete', id),
  'connection:test': (config) => ipcRenderer.invoke('connection:test', config),
  'connection:connect': (id) => ipcRenderer.invoke('connection:connect', id),
  'connection:disconnect': (id) => ipcRenderer.invoke('connection:disconnect', id),

  // Queries
  'query:execute': (connectionId, sql) => ipcRenderer.invoke('query:execute', connectionId, sql),
  'query:cancel': (queryId) => ipcRenderer.invoke('query:cancel', queryId),

  // Schema
  'schema:databases': (connectionId) => ipcRenderer.invoke('schema:databases', connectionId),
  'schema:schemas': (connectionId, database) => ipcRenderer.invoke('schema:schemas', connectionId, database),
  'schema:tables': (connectionId, schema) => ipcRenderer.invoke('schema:tables', connectionId, schema),
  'schema:columns': (connectionId, table) => ipcRenderer.invoke('schema:columns', connectionId, table),
  'schema:relationships': (connectionId, schema) => ipcRenderer.invoke('schema:relationships', connectionId, schema),
}

contextBridge.exposeInMainWorld('api', api)

// TypeScript declaration for renderer — augments Window
declare global {
  interface Window {
    api: typeof api
  }
}
```

- [ ] **Step 4: Create renderer HTML entry**

```html
<!-- src/renderer/index.html -->
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>MAI SQL</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 5: Create renderer CSS with TailwindCSS**

```css
/* src/renderer/src/assets/index.css */
@import "tailwindcss";
```

- [ ] **Step 6: Create React entry point**

```typescript
// src/renderer/src/main.tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './assets/index.css'

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
```

- [ ] **Step 7: Create minimal App.tsx (placeholder)**

```typescript
// src/renderer/src/App.tsx
export default function App() {
  return (
    <div className="flex h-screen bg-background text-foreground">
      <p className="m-auto text-muted-foreground">MAI SQL loading...</p>
    </div>
  )
}
```

- [ ] **Step 8: Start dev server to verify app launches**

```bash
npm run dev
```
Expected: Electron window opens showing "MAI SQL loading..."

- [ ] **Step 9: Commit main process and renderer shell**

```bash
git add src/main/index.ts src/preload/ src/renderer/
git commit -m "feat: add electron main process, preload IPC bridge, and react shell"
```

---

## Chunk 4: Database Driver — PostgreSQL

### Task 5: IDataSource Interface

**Files:**
- Create: `src/main/drivers/interface.ts`
- Create: `src/main/drivers/__tests__/interface.test.ts`

- [ ] **Step 1: Create the IDataSource interface**

```typescript
// src/main/drivers/interface.ts
import type { SQLDialect } from '../../shared/types/connection'
import type { QueryResult, ColumnMeta } from '../../shared/types/query'
import type { TableInfo, ColumnInfo, Relationship, IndexInfo } from '../../shared/types/schema'

export type { SQLDialect }

export interface IDataSource {
  // Lifecycle
  connect(): Promise<void>
  disconnect(): Promise<void>
  testConnection(): Promise<boolean>

  // Execution
  execute(query: string, params?: unknown[]): Promise<QueryResult>
  cancel(queryId: string): Promise<void>

  // Schema introspection
  getDatabases(): Promise<string[]>
  getSchemas(database: string): Promise<string[]>
  getTables(schema: string): Promise<TableInfo[]>
  getColumns(table: string, schema?: string): Promise<ColumnInfo[]>
  getRelationships(schema: string): Promise<Relationship[]>
  getIndexes(table: string, schema?: string): Promise<IndexInfo[]>

  // Metadata
  getDialect(): SQLDialect
  getVersion(): Promise<string>
}

// Thrown by all drivers on connection or query failure
export class DataSourceError extends Error {
  constructor(
    message: string,
    public readonly code?: string,
    public readonly cause?: unknown
  ) {
    super(message)
    this.name = 'DataSourceError'
  }
}
```

- [ ] **Step 2: Commit interface**

```bash
git add src/main/drivers/interface.ts
git commit -m "feat: add IDataSource interface — DB driver contract"
```

---

### Task 6: PostgreSQL Driver

**Files:**
- Create: `src/main/drivers/postgresql.ts`
- Create: `src/main/drivers/__tests__/postgresql.test.ts`

- [ ] **Step 1: Install pg**

```bash
npm install pg
npm install --save-dev @types/pg
```

- [ ] **Step 2: Write unit tests for PostgreSQL driver (with mocked pg)**

```typescript
// src/main/drivers/__tests__/postgresql.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { PostgreSQLDriver } from '../postgresql'
import type { ConnectionConfig } from '../../../shared/types/connection'

// Mock the pg module
vi.mock('pg', () => {
  const mockClient = {
    connect: vi.fn().mockResolvedValue(undefined),
    end: vi.fn().mockResolvedValue(undefined),
    query: vi.fn(),
  }
  const mockPool = {
    connect: vi.fn().mockResolvedValue(mockClient),
    end: vi.fn().mockResolvedValue(undefined),
    query: vi.fn(),
  }
  return { Pool: vi.fn(() => mockPool), Client: vi.fn(() => mockClient) }
})

const testConfig: ConnectionConfig = {
  id: 'test-pg',
  name: 'Test PostgreSQL',
  type: 'postgresql',
  host: 'localhost',
  port: 5432,
  database: 'testdb',
  username: 'testuser',
  password: 'testpass',
}

describe('PostgreSQLDriver', () => {
  let driver: PostgreSQLDriver

  beforeEach(() => {
    driver = new PostgreSQLDriver(testConfig)
    vi.clearAllMocks()
  })

  it('returns postgresql dialect', () => {
    expect(driver.getDialect()).toBe('postgresql')
  })

  it('execute() wraps query result into QueryResult shape', async () => {
    const { Pool } = await import('pg')
    const mockPool = new Pool() as any
    mockPool.query.mockResolvedValueOnce({
      rows: [{ id: 1, name: 'Alice' }],
      fields: [
        { name: 'id', dataTypeID: 23 },
        { name: 'name', dataTypeID: 25 },
      ],
      rowCount: 1,
    })

    await driver.connect()
    const result = await driver.execute('SELECT id, name FROM users')

    expect(result.rows).toHaveLength(1)
    expect(result.rows[0]).toEqual({ id: 1, name: 'Alice' })
    expect(result.rowCount).toBe(1)
    expect(result.columns).toHaveLength(2)
    expect(result.columns[0].name).toBe('id')
    expect(result.executionTimeMs).toBeGreaterThanOrEqual(0)
  })

  it('execute() throws DataSourceError on pg error', async () => {
    const { Pool } = await import('pg')
    const mockPool = new Pool() as any
    mockPool.query.mockRejectedValueOnce(new Error('relation "users" does not exist'))

    await driver.connect()
    await expect(driver.execute('SELECT * FROM users')).rejects.toThrow('relation "users" does not exist')
  })
})
```

- [ ] **Step 3: Run tests to verify they fail**

```bash
npx vitest run src/main/drivers/__tests__/postgresql.test.ts
```
Expected: FAIL — "Cannot find module '../postgresql'"

- [ ] **Step 4: Implement PostgreSQL driver**

```typescript
// src/main/drivers/postgresql.ts
import { Pool, type QueryResult as PGQueryResult } from 'pg'
import { nanoid } from 'nanoid'
import type { IDataSource, DataSourceError as IDataSourceError } from './interface'
import { DataSourceError } from './interface'
import type { ConnectionConfig } from '../../shared/types/connection'
import type { QueryResult, ColumnMeta } from '../../shared/types/query'
import type { TableInfo, ColumnInfo, Relationship, IndexInfo } from '../../shared/types/schema'

export class PostgreSQLDriver implements IDataSource {
  private pool: Pool | null = null

  constructor(private readonly config: ConnectionConfig) {}

  getDialect() {
    return 'postgresql' as const
  }

  async connect(): Promise<void> {
    try {
      this.pool = new Pool({
        host: this.config.host,
        port: this.config.port,
        database: this.config.database,
        user: this.config.username,
        password: this.config.password,
        ssl: this.config.ssl ? { rejectUnauthorized: false } : false,
        max: 5,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 10000,
      })
      // Verify connection is actually reachable
      const client = await this.pool.connect()
      client.release()
    } catch (err) {
      throw new DataSourceError(`Failed to connect: ${(err as Error).message}`, undefined, err)
    }
  }

  async disconnect(): Promise<void> {
    if (this.pool) {
      await this.pool.end()
      this.pool = null
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      const client = await this.pool!.connect()
      await client.query('SELECT 1')
      client.release()
      return true
    } catch {
      return false
    }
  }

  async execute(query: string, params?: unknown[]): Promise<QueryResult> {
    if (!this.pool) throw new DataSourceError('Not connected')
    const start = Date.now()
    const queryId = nanoid()
    try {
      const result: PGQueryResult = await this.pool.query(query, params)
      const columns: ColumnMeta[] = (result.fields ?? []).map((f) => ({
        name: f.name,
        dataType: String(f.dataTypeID),
      }))
      return {
        columns,
        rows: result.rows,
        rowCount: result.rowCount ?? result.rows.length,
        affectedRows: result.rowCount ?? undefined,
        executionTimeMs: Date.now() - start,
        queryId,
      }
    } catch (err) {
      throw new DataSourceError((err as Error).message, (err as any).code, err)
    }
  }

  async cancel(_queryId: string): Promise<void> {
    // PostgreSQL: send pg_cancel_backend to cancel running query
    // In a pool setup, we need the PID — simplified here
  }

  async getVersion(): Promise<string> {
    const result = await this.execute('SELECT version()')
    return String(result.rows[0]?.version ?? 'unknown')
  }

  async getDatabases(): Promise<string[]> {
    const result = await this.execute(
      `SELECT datname FROM pg_database WHERE datistemplate = false ORDER BY datname`
    )
    return result.rows.map((r) => String(r.datname))
  }

  async getSchemas(database: string): Promise<string[]> {
    const result = await this.execute(
      `SELECT schema_name FROM information_schema.schemata
       WHERE catalog_name = $1 AND schema_name NOT IN ('pg_catalog', 'information_schema', 'pg_toast')
       ORDER BY schema_name`,
      [database]
    )
    return result.rows.map((r) => String(r.schema_name))
  }

  async getTables(schema: string): Promise<TableInfo[]> {
    const result = await this.execute(
      `SELECT table_name, table_type, obj_description(
         (quote_ident(table_schema) || '.' || quote_ident(table_name))::regclass, 'pg_class'
       ) AS comment
       FROM information_schema.tables
       WHERE table_schema = $1
       ORDER BY table_name`,
      [schema]
    )
    return result.rows.map((r) => ({
      name: String(r.table_name),
      schema,
      type: r.table_type === 'VIEW' ? 'view' : 'table',
      comment: r.comment ? String(r.comment) : undefined,
    }))
  }

  async getColumns(table: string, schema = 'public'): Promise<ColumnInfo[]> {
    const result = await this.execute(
      `SELECT
         c.column_name, c.data_type, c.is_nullable,
         c.column_default,
         (SELECT true FROM information_schema.table_constraints tc
          JOIN information_schema.key_column_usage kcu
            ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
          WHERE tc.constraint_type = 'PRIMARY KEY'
            AND tc.table_name = c.table_name AND kcu.column_name = c.column_name LIMIT 1
         ) AS is_pk,
         (SELECT true FROM information_schema.key_column_usage kcu2
          JOIN information_schema.table_constraints tc2
            ON kcu2.constraint_name = tc2.constraint_name
          WHERE tc2.constraint_type = 'FOREIGN KEY'
            AND tc2.table_name = c.table_name AND kcu2.column_name = c.column_name LIMIT 1
         ) AS is_fk
       FROM information_schema.columns c
       WHERE c.table_schema = $1 AND c.table_name = $2
       ORDER BY c.ordinal_position`,
      [schema, table]
    )
    return result.rows.map((r) => ({
      name: String(r.column_name),
      type: String(r.data_type),
      nullable: r.is_nullable === 'YES',
      defaultValue: r.column_default ? String(r.column_default) : undefined,
      isPrimaryKey: r.is_pk === true,
      isForeignKey: r.is_fk === true,
    }))
  }

  async getRelationships(schema: string): Promise<Relationship[]> {
    const result = await this.execute(
      `SELECT
         tc.constraint_name,
         kcu.table_name AS source_table,
         kcu.column_name AS source_column,
         ccu.table_name AS target_table,
         ccu.column_name AS target_column
       FROM information_schema.table_constraints tc
       JOIN information_schema.key_column_usage kcu
         ON tc.constraint_name = kcu.constraint_name AND tc.constraint_schema = kcu.constraint_schema
       JOIN information_schema.constraint_column_usage ccu
         ON ccu.constraint_name = tc.constraint_name AND ccu.constraint_schema = tc.constraint_schema
       WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.constraint_schema = $1`,
      [schema]
    )
    return result.rows.map((r) => ({
      sourceTable: String(r.source_table),
      sourceColumn: String(r.source_column),
      targetTable: String(r.target_table),
      targetColumn: String(r.target_column),
      constraintName: String(r.constraint_name),
    }))
  }

  async getIndexes(table: string, schema = 'public'): Promise<IndexInfo[]> {
    const result = await this.execute(
      `SELECT
         i.relname AS index_name,
         ix.indisunique AS is_unique,
         ix.indisprimary AS is_primary,
         array_agg(a.attname ORDER BY unnest(ix.indkey)) AS columns
       FROM pg_class t
       JOIN pg_index ix ON t.oid = ix.indrelid
       JOIN pg_class i ON i.oid = ix.indexrelid
       JOIN pg_namespace n ON t.relnamespace = n.oid
       JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY(ix.indkey)
       WHERE t.relname = $1 AND n.nspname = $2
       GROUP BY i.relname, ix.indisunique, ix.indisprimary`,
      [table, schema]
    )
    return result.rows.map((r) => ({
      name: String(r.index_name),
      columns: r.columns as string[],
      isUnique: Boolean(r.is_unique),
      isPrimary: Boolean(r.is_primary),
    }))
  }
}
```

- [ ] **Step 5: Install nanoid**

```bash
npm install nanoid
```

- [ ] **Step 6: Run tests to verify they pass**

```bash
npx vitest run src/main/drivers/__tests__/postgresql.test.ts
```
Expected: PASS

- [ ] **Step 7: Commit PostgreSQL driver**

```bash
git add src/main/drivers/
git commit -m "feat: add PostgreSQL driver implementing IDataSource"
```

---

### Task 7: Driver Factory

**Files:**
- Create: `src/main/drivers/factory.ts`
- Create: `src/main/drivers/__tests__/factory.test.ts`

- [ ] **Step 1: Write factory tests**

```typescript
// src/main/drivers/__tests__/factory.test.ts
import { describe, it, expect } from 'vitest'
import { createDriver } from '../factory'
import { PostgreSQLDriver } from '../postgresql'
import type { ConnectionConfig } from '../../../shared/types/connection'

const baseConfig: Omit<ConnectionConfig, 'type'> = {
  id: 'test', name: 'test', host: 'localhost', port: 5432,
  database: 'db', username: 'user', password: 'pass'
}

describe('createDriver', () => {
  it('returns PostgreSQLDriver for postgresql type', () => {
    const driver = createDriver({ ...baseConfig, type: 'postgresql' })
    expect(driver).toBeInstanceOf(PostgreSQLDriver)
    expect(driver.getDialect()).toBe('postgresql')
  })

  it('throws for unsupported driver type', () => {
    expect(() => createDriver({ ...baseConfig, type: 'mongodb' as any }))
      .toThrow('Driver for mongodb not implemented yet')
  })
})
```

- [ ] **Step 2: Run tests to verify failure**

```bash
npx vitest run src/main/drivers/__tests__/factory.test.ts
```
Expected: FAIL

- [ ] **Step 3: Implement factory**

```typescript
// src/main/drivers/factory.ts
import type { ConnectionConfig } from '../../shared/types/connection'
import type { IDataSource } from './interface'
import { PostgreSQLDriver } from './postgresql'

export function createDriver(config: ConnectionConfig): IDataSource {
  switch (config.type) {
    case 'postgresql':
      return new PostgreSQLDriver(config)
    default:
      throw new Error(`Driver for ${config.type} not implemented yet`)
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run src/main/drivers/__tests__/factory.test.ts
```
Expected: PASS

- [ ] **Step 5: Commit factory**

```bash
git add src/main/drivers/factory.ts src/main/drivers/__tests__/factory.test.ts
git commit -m "feat: add driver factory for ConnectionConfig → IDataSource"
```

---

## Chunk 5: Security — Credential Storage

### Task 8: Keychain Wrapper

**Files:**
- Create: `src/main/security/keychain.ts`
- Create: `src/main/security/__tests__/keychain.test.ts`

- [ ] **Step 1: Write keychain tests**

```typescript
// src/main/security/__tests__/keychain.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('electron-keytar', () => ({
  default: {
    setPassword: vi.fn().mockResolvedValue(undefined),
    getPassword: vi.fn().mockResolvedValue('secret-password'),
    deletePassword: vi.fn().mockResolvedValue(true),
  }
}))

import { KeychainService } from '../keychain'

describe('KeychainService', () => {
  const keychain = new KeychainService('mai-sql-test')

  beforeEach(() => vi.clearAllMocks())

  it('stores a password', async () => {
    await keychain.setPassword('conn-1', 'mypassword')
    const keytar = (await import('electron-keytar')).default
    expect(keytar.setPassword).toHaveBeenCalledWith('mai-sql-test', 'conn-1', 'mypassword')
  })

  it('retrieves a password', async () => {
    const pass = await keychain.getPassword('conn-1')
    expect(pass).toBe('secret-password')
  })

  it('deletes a password', async () => {
    await keychain.deletePassword('conn-1')
    const keytar = (await import('electron-keytar')).default
    expect(keytar.deletePassword).toHaveBeenCalledWith('mai-sql-test', 'conn-1')
  })
})
```

- [ ] **Step 2: Run test to verify failure**

```bash
npx vitest run src/main/security/__tests__/keychain.test.ts
```

- [ ] **Step 3: Implement KeychainService**

```typescript
// src/main/security/keychain.ts
import keytar from 'electron-keytar'

export class KeychainService {
  constructor(private readonly serviceName: string) {}

  async setPassword(account: string, password: string): Promise<void> {
    await keytar.setPassword(this.serviceName, account, password)
  }

  async getPassword(account: string): Promise<string | null> {
    return keytar.getPassword(this.serviceName, account)
  }

  async deletePassword(account: string): Promise<void> {
    await keytar.deletePassword(this.serviceName, account)
  }
}

export const keychain = new KeychainService('mai-sql')
```

- [ ] **Step 4: Run test to verify pass**

```bash
npx vitest run src/main/security/__tests__/keychain.test.ts
```
Expected: PASS

- [ ] **Step 5: Commit keychain**

```bash
git add src/main/security/
git commit -m "feat: add OS keychain wrapper via electron-keytar"
```

---

## Chunk 6: IPC Handlers (Main Process)

### Task 9: Connection Manager + IPC

**Files:**
- Create: `src/main/managers/connection-manager.ts`
- Create: `src/main/ipc/connections.ts`
- Create: `src/main/managers/__tests__/connection-manager.test.ts`

The connection manager holds active driver instances and the saved connection list. IPC handlers delegate to it.

- [ ] **Step 1: Install electron-store**

```bash
npm install electron-store
npm install --save-dev @types/electron-store  # if available
```

- [ ] **Step 2: Write connection manager tests**

```typescript
// src/main/managers/__tests__/connection-manager.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('electron-store', () => {
  const store = new Map()
  return {
    default: vi.fn().mockImplementation(() => ({
      get: (key: string, def: unknown) => store.get(key) ?? def,
      set: (key: string, val: unknown) => store.set(key, val),
      delete: (key: string) => store.delete(key),
    }))
  }
})
vi.mock('../../security/keychain', () => ({
  keychain: {
    setPassword: vi.fn().mockResolvedValue(undefined),
    getPassword: vi.fn().mockResolvedValue('testpass'),
    deletePassword: vi.fn().mockResolvedValue(undefined),
  }
}))
vi.mock('../../drivers/factory', () => ({
  createDriver: vi.fn().mockReturnValue({
    connect: vi.fn().mockResolvedValue(undefined),
    disconnect: vi.fn().mockResolvedValue(undefined),
    testConnection: vi.fn().mockResolvedValue(true),
    getDialect: vi.fn().mockReturnValue('postgresql'),
  })
}))

import { ConnectionManager } from '../connection-manager'
import type { ConnectionConfig } from '../../../shared/types/connection'

const config: ConnectionConfig = {
  id: 'conn-1', name: 'Local PG', type: 'postgresql',
  host: 'localhost', port: 5432, database: 'testdb',
  username: 'user', password: 'pass', ssl: false
}

describe('ConnectionManager', () => {
  let manager: ConnectionManager

  beforeEach(() => {
    manager = new ConnectionManager()
  })

  it('saves a connection without storing password in electron-store', async () => {
    await manager.saveConnection(config)
    const saved = manager.listConnections()
    expect(saved).toHaveLength(1)
    expect(saved[0].id).toBe('conn-1')
    // Password must not be in saved connection
    expect((saved[0] as any).password).toBeUndefined()
  })

  it('connects and tracks active connection', async () => {
    await manager.saveConnection(config)
    await manager.connect('conn-1')
    expect(manager.getDriver('conn-1')).toBeDefined()
  })

  it('disconnect removes active driver', async () => {
    await manager.saveConnection(config)
    await manager.connect('conn-1')
    await manager.disconnect('conn-1')
    expect(manager.getDriver('conn-1')).toBeUndefined()
  })
})
```

- [ ] **Step 3: Run tests to verify failure**

```bash
npx vitest run src/main/managers/__tests__/connection-manager.test.ts
```

- [ ] **Step 4: Implement ConnectionManager**

```typescript
// src/main/managers/connection-manager.ts
import Store from 'electron-store'
import { createDriver } from '../drivers/factory'
import { keychain } from '../security/keychain'
import type { IDataSource } from '../drivers/interface'
import type { ConnectionConfig, SavedConnection } from '../../shared/types/connection'

interface StoreSchema {
  connections: SavedConnection[]
}

export class ConnectionManager {
  private store = new Store<StoreSchema>({ name: 'connections' })
  private activeDrivers = new Map<string, IDataSource>()

  listConnections(): SavedConnection[] {
    return this.store.get('connections', [])
  }

  async saveConnection(config: ConnectionConfig): Promise<void> {
    // Store password securely in OS keychain
    await keychain.setPassword(`conn-${config.id}`, config.password)

    // Save everything except password to electron-store
    const { password: _password, ...savedConn } = config
    const saved: SavedConnection = {
      ...savedConn,
      createdAt: new Date().toISOString(),
    }

    const connections = this.listConnections()
    const existingIdx = connections.findIndex((c) => c.id === config.id)
    if (existingIdx >= 0) {
      connections[existingIdx] = saved
    } else {
      connections.push(saved)
    }
    this.store.set('connections', connections)
  }

  async deleteConnection(id: string): Promise<void> {
    await this.disconnect(id)
    await keychain.deletePassword(`conn-${id}`)
    const connections = this.listConnections().filter((c) => c.id !== id)
    this.store.set('connections', connections)
  }

  async testConnection(config: ConnectionConfig): Promise<{ success: boolean; error?: string }> {
    const driver = createDriver(config)
    try {
      await driver.connect()
      const ok = await driver.testConnection()
      await driver.disconnect()
      return { success: ok }
    } catch (err) {
      return { success: false, error: (err as Error).message }
    }
  }

  async connect(id: string): Promise<void> {
    if (this.activeDrivers.has(id)) return // already connected

    const saved = this.listConnections().find((c) => c.id === id)
    if (!saved) throw new Error(`Connection ${id} not found`)

    const password = await keychain.getPassword(`conn-${id}`)
    if (!password) throw new Error(`No stored password for connection ${id}`)

    const config: ConnectionConfig = { ...saved, password }
    const driver = createDriver(config)
    await driver.connect()
    this.activeDrivers.set(id, driver)
  }

  async disconnect(id: string): Promise<void> {
    const driver = this.activeDrivers.get(id)
    if (driver) {
      await driver.disconnect()
      this.activeDrivers.delete(id)
    }
  }

  getDriver(id: string): IDataSource | undefined {
    return this.activeDrivers.get(id)
  }
}

// Singleton — shared across all IPC handlers
export const connectionManager = new ConnectionManager()
```

- [ ] **Step 5: Create connection IPC handlers**

```typescript
// src/main/ipc/connections.ts
import { ipcMain } from 'electron'
import { connectionManager } from '../managers/connection-manager'
import type { ConnectionConfig } from '../../shared/types/connection'

ipcMain.handle('connection:list', async () => {
  return connectionManager.listConnections()
})

ipcMain.handle('connection:save', async (_event, config: ConnectionConfig) => {
  await connectionManager.saveConnection(config)
})

ipcMain.handle('connection:delete', async (_event, id: string) => {
  await connectionManager.deleteConnection(id)
})

ipcMain.handle('connection:test', async (_event, config: ConnectionConfig) => {
  return connectionManager.testConnection(config)
})

ipcMain.handle('connection:connect', async (_event, id: string) => {
  await connectionManager.connect(id)
})

ipcMain.handle('connection:disconnect', async (_event, id: string) => {
  await connectionManager.disconnect(id)
})
```

- [ ] **Step 6: Run tests to verify they pass**

```bash
npx vitest run src/main/managers/__tests__/connection-manager.test.ts
```
Expected: PASS

- [ ] **Step 7: Commit connection management**

```bash
git add src/main/managers/ src/main/ipc/connections.ts
git commit -m "feat: add connection manager with keychain storage and IPC handlers"
```

---

### Task 10: Query & Schema IPC Handlers

**Files:**
- Create: `src/main/ipc/queries.ts`
- Create: `src/main/ipc/schema.ts`

- [ ] **Step 1: Create query IPC handler**

```typescript
// src/main/ipc/queries.ts
import { ipcMain } from 'electron'
import { connectionManager } from '../managers/connection-manager'

ipcMain.handle('query:execute', async (_event, connectionId: string, sql: string) => {
  const driver = connectionManager.getDriver(connectionId)
  if (!driver) throw new Error(`Not connected to ${connectionId}. Connect first.`)
  return driver.execute(sql)
})

ipcMain.handle('query:cancel', async (_event, queryId: string) => {
  // Driver-level cancel — simplified for Sprint 1
  console.log('Cancel requested for query:', queryId)
})
```

- [ ] **Step 2: Create schema IPC handler**

```typescript
// src/main/ipc/schema.ts
import { ipcMain } from 'electron'
import { connectionManager } from '../managers/connection-manager'

ipcMain.handle('schema:databases', async (_event, connectionId: string) => {
  const driver = connectionManager.getDriver(connectionId)
  if (!driver) throw new Error(`Not connected to ${connectionId}`)
  return driver.getDatabases()
})

ipcMain.handle('schema:schemas', async (_event, connectionId: string, database: string) => {
  const driver = connectionManager.getDriver(connectionId)
  if (!driver) throw new Error(`Not connected to ${connectionId}`)
  return driver.getSchemas(database)
})

ipcMain.handle('schema:tables', async (_event, connectionId: string, schema: string) => {
  const driver = connectionManager.getDriver(connectionId)
  if (!driver) throw new Error(`Not connected to ${connectionId}`)
  return driver.getTables(schema)
})

ipcMain.handle('schema:columns', async (_event, connectionId: string, table: string) => {
  const driver = connectionManager.getDriver(connectionId)
  if (!driver) throw new Error(`Not connected to ${connectionId}`)
  return driver.getColumns(table)
})

ipcMain.handle('schema:relationships', async (_event, connectionId: string, schema: string) => {
  const driver = connectionManager.getDriver(connectionId)
  if (!driver) throw new Error(`Not connected to ${connectionId}`)
  return driver.getRelationships(schema)
})
```

- [ ] **Step 3: Commit IPC handlers**

```bash
git add src/main/ipc/queries.ts src/main/ipc/schema.ts
git commit -m "feat: add query execution and schema introspection IPC handlers"
```

---

## Chunk 7: Renderer — State Management

### Task 11: Zustand Stores

**Files:**
- Create: `src/renderer/src/stores/connection-store.ts`
- Create: `src/renderer/src/stores/editor-store.ts`
- Create: `src/renderer/src/stores/ui-store.ts`
- Create: `src/renderer/src/lib/ipc-client.ts`

- [ ] **Step 1: Create type-safe IPC client wrapper**

```typescript
// src/renderer/src/lib/ipc-client.ts
// Thin wrapper around window.api to provide type-safe calls from the renderer
import type { IPCChannels } from '@shared/types/ipc'

type ChannelKey = keyof IPCChannels

export function invoke<K extends ChannelKey>(
  channel: K,
  ...args: Parameters<IPCChannels[K]>
): ReturnType<IPCChannels[K]> {
  return (window.api as any)[channel](...args)
}
```

- [ ] **Step 2: Create connection store**

```typescript
// src/renderer/src/stores/connection-store.ts
import { create } from 'zustand'
import { invoke } from '../lib/ipc-client'
import type { SavedConnection } from '@shared/types/connection'

interface ConnectionState {
  connections: SavedConnection[]
  activeConnectionId: string | null
  loading: boolean
  error: string | null

  loadConnections: () => Promise<void>
  connectTo: (id: string) => Promise<void>
  disconnectFrom: (id: string) => Promise<void>
  deleteConnection: (id: string) => Promise<void>
}

export const useConnectionStore = create<ConnectionState>((set, get) => ({
  connections: [],
  activeConnectionId: null,
  loading: false,
  error: null,

  loadConnections: async () => {
    set({ loading: true, error: null })
    try {
      const connections = await invoke('connection:list')
      set({ connections, loading: false })
    } catch (err) {
      set({ error: (err as Error).message, loading: false })
    }
  },

  connectTo: async (id: string) => {
    set({ loading: true, error: null })
    try {
      await invoke('connection:connect', id)
      set({ activeConnectionId: id, loading: false })
    } catch (err) {
      set({ error: (err as Error).message, loading: false })
    }
  },

  disconnectFrom: async (id: string) => {
    await invoke('connection:disconnect', id)
    const { activeConnectionId } = get()
    if (activeConnectionId === id) {
      set({ activeConnectionId: null })
    }
  },

  deleteConnection: async (id: string) => {
    await invoke('connection:delete', id)
    await get().loadConnections()
  },
}))
```

- [ ] **Step 3: Create editor store (tabs)**

```typescript
// src/renderer/src/stores/editor-store.ts
import { create } from 'zustand'
import { nanoid } from 'nanoid'
import { invoke } from '../lib/ipc-client'
import type { QueryResult } from '@shared/types/query'

export interface Tab {
  id: string
  title: string
  content: string
  connectionId: string | null
  result: QueryResult | null
  error: string | null
  isExecuting: boolean
}

interface EditorState {
  tabs: Tab[]
  activeTabId: string | null

  addTab: () => void
  closeTab: (id: string) => void
  setActiveTab: (id: string) => void
  updateTabContent: (id: string, content: string) => void
  executeQuery: (tabId: string, connectionId: string, sql: string) => Promise<void>
}

const createTab = (): Tab => ({
  id: nanoid(),
  title: 'New Query',
  content: '',
  connectionId: null,
  result: null,
  error: null,
  isExecuting: false,
})

export const useEditorStore = create<EditorState>((set, get) => ({
  tabs: [createTab()],
  activeTabId: null,

  addTab: () => {
    const tab = createTab()
    set((state) => ({ tabs: [...state.tabs, tab], activeTabId: tab.id }))
  },

  closeTab: (id: string) => {
    set((state) => {
      const tabs = state.tabs.filter((t) => t.id !== id)
      const activeTabId =
        state.activeTabId === id ? (tabs[tabs.length - 1]?.id ?? null) : state.activeTabId
      return { tabs: tabs.length > 0 ? tabs : [createTab()], activeTabId }
    })
  },

  setActiveTab: (id: string) => set({ activeTabId: id }),

  updateTabContent: (id: string, content: string) => {
    set((state) => ({
      tabs: state.tabs.map((t) => (t.id === id ? { ...t, content } : t)),
    }))
  },

  executeQuery: async (tabId: string, connectionId: string, sql: string) => {
    set((state) => ({
      tabs: state.tabs.map((t) =>
        t.id === tabId ? { ...t, isExecuting: true, error: null, result: null } : t
      ),
    }))
    try {
      const result = await invoke('query:execute', connectionId, sql)
      set((state) => ({
        tabs: state.tabs.map((t) =>
          t.id === tabId ? { ...t, isExecuting: false, result, connectionId } : t
        ),
      }))
    } catch (err) {
      set((state) => ({
        tabs: state.tabs.map((t) =>
          t.id === tabId
            ? { ...t, isExecuting: false, error: (err as Error).message }
            : t
        ),
      }))
    }
  },
}))
```

- [ ] **Step 4: Create UI store**

```typescript
// src/renderer/src/stores/ui-store.ts
import { create } from 'zustand'

interface UIState {
  sidebarWidth: number
  resultsHeight: number
  setSidebarWidth: (w: number) => void
  setResultsHeight: (h: number) => void
}

export const useUIStore = create<UIState>((set) => ({
  sidebarWidth: 260,
  resultsHeight: 280,
  setSidebarWidth: (sidebarWidth) => set({ sidebarWidth }),
  setResultsHeight: (resultsHeight) => set({ resultsHeight }),
}))
```

- [ ] **Step 5: Commit stores**

```bash
git add src/renderer/src/stores/ src/renderer/src/lib/
git commit -m "feat: add Zustand stores for connections, editor tabs, and UI state"
```

---

## Chunk 8: Renderer — Core UI Components

### Task 12: Monaco SQL Editor Component

**Files:**
- Create: `src/renderer/src/components/editor/QueryEditor.tsx`
- Create: `src/renderer/src/components/editor/TabBar.tsx`
- Create: `src/renderer/src/components/editor/EditorToolbar.tsx`

- [ ] **Step 1: Install Monaco Editor**

```bash
npm install @monaco-editor/react monaco-editor
npm install monaco-sql-languages
```

- [ ] **Step 2: Create QueryEditor component**

```typescript
// src/renderer/src/components/editor/QueryEditor.tsx
import Editor, { type Monaco } from '@monaco-editor/react'
import { useEditorStore } from '../../stores/editor-store'
import { useConnectionStore } from '../../stores/connection-store'

interface QueryEditorProps {
  tabId: string
}

export function QueryEditor({ tabId }: QueryEditorProps) {
  const { tabs, updateTabContent, executeQuery } = useEditorStore()
  const { activeConnectionId } = useConnectionStore()

  const tab = tabs.find((t) => t.id === tabId)
  if (!tab) return null

  const handleExecute = async () => {
    if (!activeConnectionId || !tab.content.trim()) return
    // If text is selected, execute selection; otherwise execute full content
    await executeQuery(tabId, activeConnectionId, tab.content)
  }

  const handleMount = (_editor: unknown, monaco: Monaco) => {
    // Register Cmd+Enter / Ctrl+Enter to execute
    // Editor handles this via EditorToolbar for now
    monaco.editor.defineTheme('mai-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [],
      colors: { 'editor.background': '#0f0f0f' },
    })
  }

  return (
    <div className="h-full w-full">
      <Editor
        height="100%"
        language="sql"
        value={tab.content}
        onChange={(val) => updateTabContent(tabId, val ?? '')}
        onMount={handleMount}
        theme="mai-dark"
        options={{
          fontSize: 14,
          fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
          minimap: { enabled: false },
          lineNumbers: 'on',
          scrollBeyondLastLine: false,
          wordWrap: 'on',
          automaticLayout: true,
          tabSize: 2,
          quickSuggestions: true,
        }}
      />
    </div>
  )
}
```

- [ ] **Step 3: Create TabBar component**

```typescript
// src/renderer/src/components/editor/TabBar.tsx
import { useEditorStore } from '../../stores/editor-store'
import { Plus, X } from 'lucide-react'
import { cn } from '../../lib/utils'

export function TabBar() {
  const { tabs, activeTabId, addTab, closeTab, setActiveTab } = useEditorStore()

  return (
    <div className="flex h-9 items-center border-b border-border bg-muted/30 overflow-x-auto">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => setActiveTab(tab.id)}
          className={cn(
            'flex h-full min-w-28 max-w-48 items-center gap-1 border-r border-border px-3 text-sm',
            'hover:bg-muted transition-colors',
            activeTabId === tab.id && 'bg-background border-t-2 border-t-primary'
          )}
        >
          <span className="flex-1 truncate text-left">{tab.title}</span>
          {tab.isExecuting && (
            <span className="h-2 w-2 animate-pulse rounded-full bg-primary" />
          )}
          <span
            role="button"
            onClick={(e) => { e.stopPropagation(); closeTab(tab.id) }}
            className="ml-1 rounded p-0.5 hover:bg-destructive/20 hover:text-destructive"
          >
            <X className="h-3 w-3" />
          </span>
        </button>
      ))}
      <button
        onClick={addTab}
        className="flex h-full items-center px-2 hover:bg-muted transition-colors"
        title="New tab (Cmd+T)"
      >
        <Plus className="h-4 w-4" />
      </button>
    </div>
  )
}
```

- [ ] **Step 4: Install lucide-react**

```bash
npm install lucide-react
```

Also install the utility helper for shadcn:

```bash
npm install clsx tailwind-merge
```

Create `src/renderer/src/lib/utils.ts`:

```typescript
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
```

- [ ] **Step 5: Create EditorToolbar component**

```typescript
// src/renderer/src/components/editor/EditorToolbar.tsx
import { Play, Square } from 'lucide-react'
import { useEditorStore } from '../../stores/editor-store'
import { useConnectionStore } from '../../stores/connection-store'
import { Button } from '../ui/button'

interface EditorToolbarProps {
  tabId: string
}

export function EditorToolbar({ tabId }: EditorToolbarProps) {
  const { tabs, executeQuery } = useEditorStore()
  const { activeConnectionId } = useConnectionStore()

  const tab = tabs.find((t) => t.id === tabId)
  if (!tab) return null

  const canExecute = !!activeConnectionId && !!tab.content.trim() && !tab.isExecuting

  return (
    <div className="flex h-10 items-center gap-2 border-b border-border px-3">
      <Button
        size="sm"
        variant={canExecute ? 'default' : 'secondary'}
        disabled={!canExecute}
        onClick={() => executeQuery(tabId, activeConnectionId!, tab.content)}
        className="gap-1"
      >
        {tab.isExecuting ? (
          <><Square className="h-3 w-3" /> Stop</>
        ) : (
          <><Play className="h-3 w-3" /> Run <span className="text-xs opacity-60 ml-1">⌘↵</span></>
        )}
      </Button>
    </div>
  )
}
```

- [ ] **Step 6: Commit editor components**

```bash
git add src/renderer/src/components/editor/
git commit -m "feat: add Monaco SQL editor, tab bar, and editor toolbar"
```

---

### Task 13: Results Grid Component

**Files:**
- Create: `src/renderer/src/components/results/ResultsGrid.tsx`
- Create: `src/renderer/src/components/results/ResultsToolbar.tsx`

- [ ] **Step 1: Create ResultsGrid with virtual scroll**

```typescript
// src/renderer/src/components/results/ResultsGrid.tsx
import { useRef } from 'react'
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  type ColumnDef,
} from '@tanstack/react-table'
import { useVirtualizer } from '@tanstack/react-virtual'
import type { QueryResult } from '@shared/types/query'

interface ResultsGridProps {
  result: QueryResult
}

export function ResultsGrid({ result }: ResultsGridProps) {
  const parentRef = useRef<HTMLDivElement>(null)

  const columns: ColumnDef<Record<string, unknown>>[] = result.columns.map((col) => ({
    id: col.name,
    accessorKey: col.name,
    header: () => (
      <div className="flex flex-col leading-tight">
        <span className="font-medium">{col.name}</span>
        <span className="text-[10px] font-normal text-muted-foreground">{col.dataType}</span>
      </div>
    ),
    cell: ({ getValue }) => {
      const val = getValue()
      if (val === null) return <span className="text-muted-foreground italic text-xs">NULL</span>
      if (val instanceof Date) return val.toISOString()
      return String(val)
    },
    size: 160,
    minSize: 60,
    maxSize: 400,
  }))

  const table = useReactTable({
    data: result.rows,
    columns,
    getCoreRowModel: getCoreRowModel(),
    columnResizeMode: 'onChange',
  })

  const { rows } = table.getRowModel()

  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 36,
    overscan: 10,
  })

  const virtualRows = rowVirtualizer.getVirtualItems()
  const totalSize = rowVirtualizer.getTotalSize()
  const paddingTop = virtualRows.length > 0 ? virtualRows[0].start : 0
  const paddingBottom =
    virtualRows.length > 0 ? totalSize - virtualRows[virtualRows.length - 1].end : 0

  return (
    <div ref={parentRef} className="h-full overflow-auto text-sm">
      <table className="w-full border-collapse">
        <thead className="sticky top-0 z-10 bg-muted/80 backdrop-blur-sm">
          {table.getHeaderGroups().map((hg) => (
            <tr key={hg.id}>
              {hg.headers.map((header) => (
                <th
                  key={header.id}
                  style={{ width: header.getSize() }}
                  className="border-b border-r border-border px-2 py-1.5 text-left font-medium"
                >
                  {flexRender(header.column.columnDef.header, header.getContext())}
                  {/* Resize handle */}
                  <div
                    onMouseDown={header.getResizeHandler()}
                    onTouchStart={header.getResizeHandler()}
                    className={`absolute right-0 top-0 h-full w-1 cursor-col-resize select-none touch-none bg-border opacity-0 hover:opacity-100 ${
                      header.column.getIsResizing() ? 'opacity-100' : ''
                    }`}
                  />
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {paddingTop > 0 && <tr><td style={{ height: paddingTop }} /></tr>}
          {virtualRows.map((vRow) => {
            const row = rows[vRow.index]
            return (
              <tr
                key={row.id}
                className="hover:bg-muted/50 border-b border-border/50"
              >
                {row.getVisibleCells().map((cell) => (
                  <td
                    key={cell.id}
                    style={{ width: cell.column.getSize() }}
                    className="truncate border-r border-border/30 px-2 py-1.5"
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            )
          })}
          {paddingBottom > 0 && <tr><td style={{ height: paddingBottom }} /></tr>}
        </tbody>
      </table>
    </div>
  )
}
```

- [ ] **Step 2: Create ResultsToolbar**

```typescript
// src/renderer/src/components/results/ResultsToolbar.tsx
import type { QueryResult } from '@shared/types/query'

interface ResultsToolbarProps {
  result: QueryResult | null
  error: string | null
  isExecuting: boolean
}

export function ResultsToolbar({ result, error, isExecuting }: ResultsToolbarProps) {
  if (isExecuting) {
    return (
      <div className="flex h-8 items-center border-b border-border px-3 text-xs text-muted-foreground">
        <span className="animate-pulse">Executing query...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex h-8 items-center border-b border-border bg-destructive/10 px-3 text-xs text-destructive">
        <span className="font-medium mr-1">Error:</span> {error}
      </div>
    )
  }

  if (!result) return <div className="h-8 border-b border-border" />

  return (
    <div className="flex h-8 items-center gap-4 border-b border-border px-3 text-xs text-muted-foreground">
      <span>{result.rowCount.toLocaleString()} rows</span>
      <span>{result.executionTimeMs}ms</span>
      {result.affectedRows != null && (
        <span>{result.affectedRows} rows affected</span>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Commit results components**

```bash
git add src/renderer/src/components/results/
git commit -m "feat: add virtual-scroll results grid and toolbar (TanStack Table + Virtual)"
```

---

### Task 14: Database Schema Explorer Sidebar

**Files:**
- Create: `src/renderer/src/components/sidebar/DatabaseTree.tsx`
- Create: `src/renderer/src/components/sidebar/ConnectionList.tsx`

- [ ] **Step 1: Create DatabaseTree component**

```typescript
// src/renderer/src/components/sidebar/DatabaseTree.tsx
import { useState, useEffect } from 'react'
import { ChevronRight, ChevronDown, Database, Table, Columns } from 'lucide-react'
import { invoke } from '../../lib/ipc-client'
import { useEditorStore } from '../../stores/editor-store'
import type { TableInfo, ColumnInfo } from '@shared/types/schema'
import { cn } from '../../lib/utils'

interface DatabaseTreeProps {
  connectionId: string
}

interface TreeNode {
  type: 'schema' | 'table' | 'column'
  name: string
  schema?: string
  children?: TreeNode[]
  columnInfo?: ColumnInfo
  loading?: boolean
  expanded?: boolean
}

export function DatabaseTree({ connectionId }: DatabaseTreeProps) {
  const [schemas, setSchemas] = useState<string[]>([])
  const [expanded, setExpanded] = useState<Set<string>>(new Set(['public']))
  const [tablesBySchema, setTablesBySchema] = useState<Record<string, TableInfo[]>>({})
  const [columnsByTable, setColumnsByTable] = useState<Record<string, ColumnInfo[]>>({})
  const { tabs, activeTabId, updateTabContent } = useEditorStore()

  useEffect(() => {
    invoke('schema:databases', connectionId).then((dbs) => {
      invoke('schema:schemas', connectionId, dbs[0] ?? '').then(setSchemas)
    })
  }, [connectionId])

  const loadTables = async (schema: string) => {
    if (tablesBySchema[schema]) return
    const tables = await invoke('schema:tables', connectionId, schema)
    setTablesBySchema((prev) => ({ ...prev, [schema]: tables }))
  }

  const loadColumns = async (schema: string, table: string) => {
    const key = `${schema}.${table}`
    if (columnsByTable[key]) return
    const columns = await invoke('schema:columns', connectionId, table)
    setColumnsByTable((prev) => ({ ...prev, [key]: columns }))
  }

  const toggle = async (key: string, onExpand?: () => Promise<void>) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(key)) {
        next.delete(key)
      } else {
        next.add(key)
        onExpand?.()
      }
      return next
    })
    if (!expanded.has(key)) {
      await onExpand?.()
    }
  }

  const insertTableQuery = (schema: string, table: string) => {
    const sql = `SELECT *\nFROM ${schema}.${table}\nLIMIT 100;`
    if (activeTabId) updateTabContent(activeTabId, sql)
  }

  return (
    <div className="select-none text-sm">
      {schemas.map((schema) => (
        <div key={schema}>
          <button
            onClick={() => toggle(schema, () => loadTables(schema))}
            className="flex w-full items-center gap-1 px-2 py-1 hover:bg-muted"
          >
            {expanded.has(schema)
              ? <ChevronDown className="h-3.5 w-3.5 shrink-0" />
              : <ChevronRight className="h-3.5 w-3.5 shrink-0" />}
            <Database className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <span className="font-medium">{schema}</span>
          </button>

          {expanded.has(schema) && (tablesBySchema[schema] ?? []).map((table) => {
            const tableKey = `${schema}.${table.name}`
            return (
              <div key={table.name}>
                <button
                  onClick={() => toggle(tableKey, () => loadColumns(schema, table.name))}
                  onDoubleClick={() => insertTableQuery(schema, table.name)}
                  className="flex w-full items-center gap-1 py-0.5 pl-6 pr-2 hover:bg-muted"
                >
                  {expanded.has(tableKey)
                    ? <ChevronDown className="h-3 w-3 shrink-0" />
                    : <ChevronRight className="h-3 w-3 shrink-0" />}
                  <Table className={cn('h-3.5 w-3.5 shrink-0', table.type === 'view' ? 'text-blue-500' : 'text-orange-500')} />
                  <span>{table.name}</span>
                </button>

                {expanded.has(tableKey) && (columnsByTable[tableKey] ?? []).map((col) => (
                  <div
                    key={col.name}
                    className="flex items-center gap-1 py-0.5 pl-12 pr-2 text-xs text-muted-foreground hover:bg-muted"
                  >
                    <Columns className="h-3 w-3 shrink-0" />
                    <span className={cn(col.isPrimaryKey && 'text-yellow-500 font-medium')}>
                      {col.name}
                    </span>
                    <span className="ml-auto text-[10px]">{col.type}</span>
                  </div>
                ))}
              </div>
            )
          })}
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 2: Create ConnectionList component**

```typescript
// src/renderer/src/components/sidebar/ConnectionList.tsx
import { useEffect } from 'react'
import { Plug, PlugZap, Trash2 } from 'lucide-react'
import { useConnectionStore } from '../../stores/connection-store'
import { cn } from '../../lib/utils'

export function ConnectionList() {
  const { connections, activeConnectionId, loading, loadConnections, connectTo, disconnectFrom, deleteConnection } =
    useConnectionStore()

  useEffect(() => {
    loadConnections()
  }, [])

  if (loading) {
    return <div className="px-3 py-2 text-xs text-muted-foreground animate-pulse">Loading...</div>
  }

  if (connections.length === 0) {
    return (
      <div className="px-3 py-4 text-center text-xs text-muted-foreground">
        No connections yet.<br />Add one to get started.
      </div>
    )
  }

  return (
    <div className="space-y-0.5 p-1">
      {connections.map((conn) => {
        const isActive = conn.id === activeConnectionId
        return (
          <div
            key={conn.id}
            className={cn(
              'group flex items-center gap-2 rounded px-2 py-1.5 text-sm cursor-pointer',
              isActive ? 'bg-primary/10 text-primary' : 'hover:bg-muted'
            )}
          >
            <button
              onClick={() => isActive ? disconnectFrom(conn.id) : connectTo(conn.id)}
              className="flex flex-1 items-center gap-2 min-w-0"
            >
              {isActive
                ? <PlugZap className="h-4 w-4 shrink-0 text-primary" />
                : <Plug className="h-4 w-4 shrink-0 text-muted-foreground" />}
              <span className="truncate">{conn.name}</span>
            </button>
            <button
              onClick={() => deleteConnection(conn.id)}
              className="hidden group-hover:flex h-5 w-5 items-center justify-center rounded hover:bg-destructive/20 hover:text-destructive"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 3: Commit sidebar components**

```bash
git add src/renderer/src/components/sidebar/
git commit -m "feat: add database schema explorer tree and connection list sidebar"
```

---

## Chunk 9: Connection Form & Main Layout

### Task 15: Connection Form Dialog

**Files:**
- Create: `src/renderer/src/components/settings/ConnectionForm.tsx`

- [ ] **Step 1: Install shadcn/ui components needed**

```bash
npx shadcn@latest add dialog form input label select button
```

- [ ] **Step 2: Create ConnectionForm component**

```typescript
// src/renderer/src/components/settings/ConnectionForm.tsx
import { useState } from 'react'
import { nanoid } from 'nanoid'
import { invoke } from '../../lib/ipc-client'
import { useConnectionStore } from '../../stores/connection-store'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger
} from '../ui/dialog'
import type { ConnectionConfig, SQLDialect } from '@shared/types/connection'

const DIALECT_DEFAULTS: Record<SQLDialect, { port: number; placeholder: string }> = {
  postgresql: { port: 5432, placeholder: 'PostgreSQL' },
  mysql:      { port: 3306, placeholder: 'MySQL' },
  mariadb:    { port: 3306, placeholder: 'MariaDB' },
  mongodb:    { port: 27017, placeholder: 'MongoDB' },
  clickhouse: { port: 8123, placeholder: 'ClickHouse' },
  mssql:      { port: 1433, placeholder: 'SQL Server' },
}

export function ConnectionForm() {
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<Partial<ConnectionConfig>>({
    type: 'postgresql', host: 'localhost', port: 5432, ssl: false
  })
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ success: boolean; error?: string } | null>(null)
  const { loadConnections } = useConnectionStore()

  const set = (key: keyof ConnectionConfig, value: unknown) =>
    setForm((prev) => ({ ...prev, [key]: value }))

  const handleTest = async () => {
    if (!form.host || !form.database || !form.username) return
    setTesting(true)
    setTestResult(null)
    const result = await invoke('connection:test', form as ConnectionConfig)
    setTestResult(result)
    setTesting(false)
  }

  const handleSave = async () => {
    const config: ConnectionConfig = {
      id: form.id ?? nanoid(),
      name: form.name || `${form.host}/${form.database}`,
      type: form.type as SQLDialect,
      host: form.host!,
      port: form.port!,
      database: form.database!,
      username: form.username!,
      password: form.password!,
      ssl: form.ssl,
    }
    await invoke('connection:save', config)
    await loadConnections()
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="w-full">+ New Connection</Button>
      </DialogTrigger>
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
                set('type', type)
                set('port', DIALECT_DEFAULTS[type].port)
              }}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
            >
              {Object.entries(DIALECT_DEFAULTS).map(([k, v]) => (
                <option key={k} value={k}>{v.placeholder}</option>
              ))}
            </select>
          </div>
          <div className="grid gap-1.5">
            <Label>Name (optional)</Label>
            <Input placeholder="My Database" value={form.name ?? ''} onChange={(e) => set('name', e.target.value)} />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="col-span-2 grid gap-1.5">
              <Label>Host</Label>
              <Input value={form.host ?? ''} onChange={(e) => set('host', e.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label>Port</Label>
              <Input type="number" value={form.port ?? ''} onChange={(e) => set('port', Number(e.target.value))} />
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label>Database</Label>
            <Input value={form.database ?? ''} onChange={(e) => set('database', e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="grid gap-1.5">
              <Label>Username</Label>
              <Input value={form.username ?? ''} onChange={(e) => set('username', e.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label>Password</Label>
              <Input type="password" value={form.password ?? ''} onChange={(e) => set('password', e.target.value)} />
            </div>
          </div>
          {testResult && (
            <p className={`text-xs ${testResult.success ? 'text-green-500' : 'text-destructive'}`}>
              {testResult.success ? '✓ Connection successful' : `✗ ${testResult.error}`}
            </p>
          )}
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={handleTest} disabled={testing}>
              {testing ? 'Testing...' : 'Test Connection'}
            </Button>
            <Button onClick={handleSave}>Save</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
```

- [ ] **Step 3: Commit connection form**

```bash
git add src/renderer/src/components/settings/
git commit -m "feat: add connection form dialog with test-before-save"
```

---

### Task 16: Main Application Layout

**Files:**
- Modify: `src/renderer/src/App.tsx`
- Create: `src/renderer/src/components/layout/MainLayout.tsx`

- [ ] **Step 1: Create MainLayout**

```typescript
// src/renderer/src/components/layout/MainLayout.tsx
import { useState } from 'react'
import { useConnectionStore } from '../../stores/connection-store'
import { useEditorStore } from '../../stores/editor-store'
import { ConnectionList } from '../sidebar/ConnectionList'
import { DatabaseTree } from '../sidebar/DatabaseTree'
import { ConnectionForm } from '../settings/ConnectionForm'
import { TabBar } from '../editor/TabBar'
import { QueryEditor } from '../editor/QueryEditor'
import { EditorToolbar } from '../editor/EditorToolbar'
import { ResultsGrid } from '../results/ResultsGrid'
import { ResultsToolbar } from '../results/ResultsToolbar'

export function MainLayout() {
  const { activeConnectionId } = useConnectionStore()
  const { tabs, activeTabId, setActiveTab } = useEditorStore()
  const [sidebarWidth, setSidebarWidth] = useState(260)
  const [resultsHeight, setResultsHeight] = useState(280)

  // Ensure there's an active tab
  const activeTab = tabs.find((t) => t.id === activeTabId) ?? tabs[0]

  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground">
      {/* Sidebar */}
      <aside
        style={{ width: sidebarWidth }}
        className="flex flex-col border-r border-border shrink-0 overflow-hidden"
      >
        <div className="p-2 border-b border-border">
          <ConnectionForm />
        </div>
        <div className="overflow-y-auto flex-1">
          <div className="py-1">
            <p className="px-3 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Connections
            </p>
            <ConnectionList />
          </div>
          {activeConnectionId && (
            <div className="py-1 border-t border-border">
              <p className="px-3 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Schema
              </p>
              <DatabaseTree connectionId={activeConnectionId} />
            </div>
          )}
        </div>
      </aside>

      {/* Main content */}
      <main className="flex flex-1 flex-col overflow-hidden">
        <TabBar />

        {activeTab && (
          <div className="flex flex-1 flex-col overflow-hidden">
            <EditorToolbar tabId={activeTab.id} />

            {/* Editor area */}
            <div style={{ flex: 1, minHeight: 0 }}>
              <QueryEditor tabId={activeTab.id} />
            </div>

            {/* Results area */}
            <div
              style={{ height: resultsHeight }}
              className="border-t border-border flex flex-col shrink-0"
            >
              <ResultsToolbar
                result={activeTab.result}
                error={activeTab.error}
                isExecuting={activeTab.isExecuting}
              />
              <div className="flex-1 overflow-hidden">
                {activeTab.result && <ResultsGrid result={activeTab.result} />}
                {!activeTab.result && !activeTab.error && !activeTab.isExecuting && (
                  <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                    Run a query to see results
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
```

- [ ] **Step 2: Update App.tsx to use MainLayout**

```typescript
// src/renderer/src/App.tsx
import { MainLayout } from './components/layout/MainLayout'

export default function App() {
  return <MainLayout />
}
```

- [ ] **Step 3: Commit layout**

```bash
git add src/renderer/src/App.tsx src/renderer/src/components/layout/
git commit -m "feat: wire up main application layout with sidebar, editor, and results pane"
```

---

## Chunk 10: i18n + Final Wiring

### Task 17: i18n Setup

**Files:**
- Create: `src/renderer/src/i18n/config.ts`
- Create: `src/renderer/src/i18n/en/translation.json`
- Create: `src/renderer/src/i18n/vi/translation.json`

- [ ] **Step 1: Create i18n config**

```typescript
// src/renderer/src/i18n/config.ts
import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import en from './en/translation.json'
import vi from './vi/translation.json'

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      vi: { translation: vi },
    },
    lng: 'en',
    fallbackLng: 'en',
    interpolation: { escapeValue: false },
  })

export default i18n
```

- [ ] **Step 2: Create English translations**

```json
// src/renderer/src/i18n/en/translation.json
{
  "app": { "name": "MAI SQL" },
  "connections": {
    "title": "Connections",
    "add": "New Connection",
    "test": "Test Connection",
    "save": "Save",
    "empty": "No connections yet.\nAdd one to get started.",
    "loading": "Loading..."
  },
  "editor": {
    "run": "Run",
    "stop": "Stop",
    "newTab": "New Query"
  },
  "results": {
    "rows": "{{count}} rows",
    "empty": "Run a query to see results"
  },
  "schema": {
    "title": "Schema"
  }
}
```

- [ ] **Step 3: Create Vietnamese translations**

```json
// src/renderer/src/i18n/vi/translation.json
{
  "app": { "name": "MAI SQL" },
  "connections": {
    "title": "Kết nối",
    "add": "Kết nối mới",
    "test": "Kiểm tra kết nối",
    "save": "Lưu",
    "empty": "Chưa có kết nối.\nThêm một kết nối để bắt đầu.",
    "loading": "Đang tải..."
  },
  "editor": {
    "run": "Chạy",
    "stop": "Dừng",
    "newTab": "Truy vấn mới"
  },
  "results": {
    "rows": "{{count}} hàng",
    "empty": "Chạy truy vấn để xem kết quả"
  },
  "schema": {
    "title": "Lược đồ"
  }
}
```

- [ ] **Step 4: Import i18n in renderer entry**

```typescript
// src/renderer/src/main.tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './assets/index.css'
import './i18n/config'  // ← add this line

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
```

- [ ] **Step 5: Commit i18n**

```bash
git add src/renderer/src/i18n/ src/renderer/src/main.tsx
git commit -m "feat: add react-i18next with English and Vietnamese translations"
```

---

### Task 18: Keyboard Shortcuts

**Files:**
- Create: `src/renderer/src/hooks/useKeyboardShortcuts.ts`

- [ ] **Step 1: Implement global keyboard shortcuts hook**

```typescript
// src/renderer/src/hooks/useKeyboardShortcuts.ts
import { useEffect } from 'react'
import { useEditorStore } from '../stores/editor-store'
import { useConnectionStore } from '../stores/connection-store'

export function useKeyboardShortcuts() {
  const { addTab, closeTab, activeTabId, tabs, executeQuery } = useEditorStore()
  const { activeConnectionId } = useConnectionStore()

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().includes('MAC')
      const mod = isMac ? e.metaKey : e.ctrlKey

      if (!mod) return

      if (e.key === 't') {
        e.preventDefault()
        addTab()
      } else if (e.key === 'w') {
        e.preventDefault()
        if (activeTabId) closeTab(activeTabId)
      } else if (e.key === 'Enter') {
        e.preventDefault()
        const activeTab = tabs.find((t) => t.id === activeTabId)
        if (activeTab && activeConnectionId && activeTab.content.trim()) {
          executeQuery(activeTabId!, activeConnectionId, activeTab.content)
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [addTab, closeTab, executeQuery, activeTabId, tabs, activeConnectionId])
}
```

- [ ] **Step 2: Wire shortcuts into App**

```typescript
// src/renderer/src/App.tsx
import { MainLayout } from './components/layout/MainLayout'
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts'

export default function App() {
  useKeyboardShortcuts()
  return <MainLayout />
}
```

- [ ] **Step 3: Commit keyboard shortcuts**

```bash
git add src/renderer/src/hooks/ src/renderer/src/App.tsx
git commit -m "feat: add keyboard shortcuts (Cmd+Enter execute, Cmd+T new tab, Cmd+W close tab)"
```

---

### Task 19: Run All Tests + Manual Verification

- [ ] **Step 1: Run full unit test suite**

```bash
npx vitest run
```
Expected: All tests PASS, 0 failures

- [ ] **Step 2: Run type check**

```bash
npx tsc --noEmit
```
Expected: 0 errors

- [ ] **Step 3: Run linter**

```bash
npx eslint . --ext .ts,.tsx
```
Expected: 0 errors (warnings acceptable)

- [ ] **Step 4: Launch app in dev mode**

```bash
npm run dev
```

Manual verification checklist (from Sprint 1 verification plan):
- [ ] Electron window opens
- [ ] Click "New Connection" → form appears → fill PostgreSQL details → "Test Connection" succeeds
- [ ] Save connection → appears in sidebar
- [ ] Click connection → connects → schema explorer shows databases/schemas/tables
- [ ] Open schema explorer → expand schema → see tables → expand table → see columns with types
- [ ] Type SQL in editor → Cmd+Enter → results appear in grid
- [ ] Grid shows column names and data types in header
- [ ] Open 2 tabs (Cmd+T) → each has independent content
- [ ] Close app → reopen → connections still present (persisted in electron-store)

- [ ] **Step 5: Final commit**

```bash
git add .
git commit -m "feat: complete sprint 1 — connect, query, and explore PostgreSQL"
```

---

## Summary

**Total Tasks:** 19 tasks across 10 chunks
**Files Created:** ~45 files
**Sprint 1 User Stories Covered:** US-1.1 through US-1.6

**What's built:**
- Electron app with secure IPC (contextBridge pattern)
- PostgreSQL driver with full IDataSource implementation
- OS keychain credential storage (never plaintext)
- Monaco SQL editor with tabs
- Virtual-scroll results grid (handles 100k+ rows)
- Schema explorer sidebar (databases > schemas > tables > columns)
- Connection form with test-before-save
- Keyboard shortcuts (Cmd+Enter, Cmd+T, Cmd+W)
- i18n (English + Vietnamese)

**Not in Sprint 1** (planned for Sprint 2+):
- MySQL/MariaDB drivers (Sprint 2)
- Query history persistence (Sprint 2)
- AI features (Sprint 3)
- MongoDB/ClickHouse/MSSQL (Sprint 4)
