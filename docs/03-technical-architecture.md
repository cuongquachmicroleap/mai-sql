# MAI SQL — Technical Architecture

## Architecture Overview

### Electron with In-Process Node.js Backend

Since this is a standalone desktop app (like DBeaver), all database connections and AI calls run directly in Electron's main process. No separate server needed.

```
┌──────────────────────────────────────────────────┐
│                 Electron App                      │
│                                                   │
│  ┌─────────────────────────────────────────────┐ │
│  │         Main Process (Node.js)               │ │
│  │                                              │ │
│  │  ┌────────────────────────────────────────┐  │ │
│  │  │     DB Driver Abstraction (IDataSource) │  │ │
│  │  │  pg │ mysql2 │ mariadb │ mongodb       │  │ │
│  │  │  tedious │ @clickhouse/client          │  │ │
│  │  └────────────────────────────────────────┘  │ │
│  │  ┌────────────────────────────────────────┐  │ │
│  │  │     AI Provider Abstraction (IAIProvider)│  │ │
│  │  │  OpenAI │ Anthropic │ Gemini           │  │ │
│  │  │  Ollama │ OpenRouter                   │  │ │
│  │  └────────────────────────────────────────┘  │ │
│  │  ┌────────────────────────────────────────┐  │ │
│  │  │     Security                           │  │ │
│  │  │  electron-keytar (OS Keychain)         │  │ │
│  │  │  SSL/TLS │ SSH Tunnel                  │  │ │
│  │  └────────────────────────────────────────┘  │ │
│  │  ┌────────────────────────────────────────┐  │ │
│  │  │     Storage                            │  │ │
│  │  │  better-sqlite3 (history, context idx) │  │ │
│  │  │  electron-store (settings, prefs)      │  │ │
│  │  └────────────────────────────────────────┘  │ │
│  └─────────────────┬───────────────────────────┘ │
│                    │ IPC (contextBridge)          │
│  ┌─────────────────▼───────────────────────────┐ │
│  │         Renderer Process (React)             │ │
│  │                                              │ │
│  │  Monaco Editor │ Results Grid │ Sidebar      │ │
│  │  AI Panel │ ER Diagram │ Settings            │ │
│  │  Tab Manager │ Theme │ i18n                  │ │
│  └──────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────┘
```

### Why Electron (Not Tauri)

- **All TypeScript** — Single language for frontend, backend, and shared types
- **Mature ecosystem** — Native module support, established patterns for desktop apps
- **Node.js drivers** — Direct access to `pg`, `mysql2`, `mongodb`, `tedious`, etc. without FFI
- **Faster initial development** — No Rust learning curve
- **Community** — Larger community, more resources and plugins

---

## Tech Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| Desktop | Electron 35+ | All-TypeScript, mature, Node.js native modules |
| Build | Vite + electron-vite | Fast HMR, ESM, Electron-optimized |
| Frontend | React 19 + TypeScript 5 | Largest ecosystem, Monaco integration |
| Styling | TailwindCSS 4 + shadcn/ui | Rapid UI, accessible components, dark mode |
| State | Zustand 5 | Lightweight, TypeScript-first |
| Editor | Monaco Editor + monaco-sql-languages | Industry standard, multi-dialect SQL |
| Data Grid | TanStack Table + TanStack Virtual | Virtual scroll, sorting, filtering, resizing |
| ER Diagram | React Flow | Interactive node diagrams, auto-layout |
| i18n | react-i18next | Mature, JSON-based translations |
| IPC | Electron contextBridge + ipcMain/ipcRenderer | Secure main↔renderer communication |
| DB Drivers | pg, mysql2, mariadb, mongodb, tedious, @clickhouse/client | Official/mature Node.js drivers |
| AI SDKs | openai, @anthropic-ai/sdk, @google/generative-ai | Official SDKs + HTTP for Ollama/OpenRouter |
| Credentials | electron-keytar | OS keychain (macOS Keychain, Win Credential Mgr, Linux Secret Service) |
| Local Storage | better-sqlite3 | Query history, context index, saved queries |
| Settings | electron-store | App preferences, connection configs (non-secret) |
| Testing | Vitest + React Testing Library + Playwright | Unit + integration + E2E |
| Packaging | electron-builder | macOS DMG, Windows NSIS, Linux AppImage/deb |
| Auto-update | electron-updater | GitHub Releases-based updates |
| CI/CD | GitHub Actions | Lint, test, build, release for 3 platforms |
| Lint | ESLint 9 + Prettier | Code quality |

---

## Project Structure

```
mai-sql/
├── package.json                    # Root package
├── LICENSE                         # MIT
├── README.md
│
├── src/
│   ├── main/                       # Electron main process
│   │   ├── index.ts                # App entry, window management
│   │   ├── ipc/                    # IPC handlers
│   │   │   ├── connections.ts      # Connection CRUD IPC
│   │   │   ├── queries.ts          # Query execution IPC
│   │   │   ├── schema.ts           # Schema introspection IPC
│   │   │   └── ai.ts               # AI proxy IPC
│   │   ├── drivers/                # Database drivers
│   │   │   ├── interface.ts        # IDataSource interface ★
│   │   │   ├── postgresql.ts
│   │   │   ├── mysql.ts
│   │   │   ├── mariadb.ts
│   │   │   ├── mongodb.ts
│   │   │   ├── mssql.ts
│   │   │   ├── clickhouse.ts
│   │   │   └── factory.ts          # ConnectionConfig → driver
│   │   ├── ai/                     # AI providers
│   │   │   ├── interface.ts        # IAIProvider interface ★
│   │   │   ├── openai.ts
│   │   │   ├── anthropic.ts
│   │   │   ├── gemini.ts
│   │   │   ├── ollama.ts
│   │   │   ├── openrouter.ts
│   │   │   ├── factory.ts
│   │   │   ├── context-builder.ts  # Schema+history→AI context ★
│   │   │   └── prompts/
│   │   │       ├── generate.ts     # NL → SQL
│   │   │       ├── autocomplete.ts
│   │   │       ├── fix-error.ts
│   │   │       └── optimize.ts
│   │   ├── security/
│   │   │   ├── keychain.ts         # electron-keytar wrapper
│   │   │   └── ssh-tunnel.ts
│   │   └── storage/
│   │       ├── database.ts         # better-sqlite3 setup
│   │       ├── history.ts          # Query history
│   │       └── context-index.ts    # Project context store
│   │
│   ├── renderer/                    # React frontend
│   │   ├── index.html
│   │   ├── main.tsx                # React entry
│   │   ├── App.tsx
│   │   ├── components/
│   │   │   ├── editor/             # Monaco wrapper, tabs
│   │   │   │   ├── QueryEditor.tsx
│   │   │   │   ├── TabBar.tsx
│   │   │   │   └── EditorToolbar.tsx
│   │   │   ├── results/            # Data grid
│   │   │   │   ├── ResultsGrid.tsx
│   │   │   │   ├── ResultsToolbar.tsx
│   │   │   │   └── ExportDialog.tsx
│   │   │   ├── sidebar/            # DB explorer
│   │   │   │   ├── DatabaseTree.tsx
│   │   │   │   ├── ConnectionList.tsx
│   │   │   │   └── SchemaNode.tsx
│   │   │   ├── ai/                 # AI features
│   │   │   │   ├── AIPromptPanel.tsx
│   │   │   │   ├── AIFixSuggestion.tsx
│   │   │   │   └── AIOptimizeView.tsx
│   │   │   ├── er-diagram/
│   │   │   │   └── ERDiagram.tsx
│   │   │   ├── settings/
│   │   │   │   ├── ConnectionForm.tsx
│   │   │   │   ├── AISettings.tsx
│   │   │   │   └── GeneralSettings.tsx
│   │   │   ├── onboarding/
│   │   │   │   └── OnboardingWizard.tsx
│   │   │   └── common/             # Shared UI components
│   │   ├── hooks/
│   │   ├── stores/                 # Zustand
│   │   │   ├── connection-store.ts
│   │   │   ├── editor-store.ts
│   │   │   ├── ai-store.ts
│   │   │   └── ui-store.ts
│   │   ├── lib/
│   │   │   ├── ipc-client.ts      # Type-safe IPC wrapper
│   │   │   └── utils.ts
│   │   └── i18n/
│   │       ├── config.ts
│   │       ├── en/
│   │       │   └── translation.json
│   │       └── vi/
│   │           └── translation.json
│   │
│   ├── shared/                      # Shared types (main ↔ renderer)
│   │   └── types/
│   │       ├── connection.ts
│   │       ├── query.ts
│   │       ├── schema.ts
│   │       ├── ai.ts
│   │       └── ipc.ts             # IPC channel type definitions
│   │
│   └── preload/                     # Electron preload script
│       └── index.ts                # contextBridge API exposure
│
├── electron-builder.yml             # Build config for macOS/Win/Linux
├── electron.vite.config.ts          # electron-vite config
├── tsconfig.json
├── tailwind.config.ts
├── .eslintrc.js
├── .prettierrc
└── .github/
    └── workflows/
        ├── ci.yml                  # Lint + test on PR
        └── release.yml             # Build + publish on tag
```

---

## Core Interfaces

### Database Driver Abstraction

**File:** `src/main/drivers/interface.ts`

This is the architectural foundation. All 6 databases are normalized behind one interface.

```typescript
export type SQLDialect = 'postgresql' | 'mysql' | 'mariadb' | 'mongodb' | 'clickhouse' | 'mssql';

export interface ConnectionConfig {
  id: string;
  name: string;
  type: SQLDialect;
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;  // retrieved from OS keychain at runtime
  ssl?: boolean;
  sshTunnel?: SSHTunnelConfig;
}

export interface SSHTunnelConfig {
  host: string;
  port: number;
  username: string;
  privateKey?: string;
  password?: string;
}

export interface IDataSource {
  // Connection lifecycle
  connect(config: ConnectionConfig): Promise<void>;
  disconnect(): Promise<void>;
  testConnection(): Promise<boolean>;

  // Query execution
  execute(query: string, params?: unknown[]): Promise<QueryResult>;
  stream(query: string): AsyncIterable<Row>;
  cancel(queryId: string): Promise<void>;

  // Schema introspection
  getDatabases(): Promise<string[]>;
  getSchemas(database: string): Promise<string[]>;
  getTables(schema: string): Promise<TableInfo[]>;
  getColumns(table: string): Promise<ColumnInfo[]>;
  getRelationships(schema: string): Promise<Relationship[]>;
  getIndexes(table: string): Promise<IndexInfo[]>;

  // Metadata
  getDialect(): SQLDialect;
  getVersion(): Promise<string>;
}

export interface QueryResult {
  columns: ColumnMeta[];
  rows: Record<string, unknown>[];
  rowCount: number;
  affectedRows?: number;
  executionTimeMs: number;
  warnings?: string[];
}

export interface TableInfo {
  name: string;
  schema: string;
  type: 'table' | 'view' | 'materialized_view';
  rowCount?: number;
  comment?: string;
}

export interface ColumnInfo {
  name: string;
  type: string;
  nullable: boolean;
  defaultValue?: string;
  isPrimaryKey: boolean;
  isForeignKey: boolean;
  comment?: string;
}

export interface Relationship {
  sourceTable: string;
  sourceColumn: string;
  targetTable: string;
  targetColumn: string;
  constraintName: string;
}

export interface IndexInfo {
  name: string;
  columns: string[];
  isUnique: boolean;
  isPrimary: boolean;
}
```

**MongoDB special handling:**
- `execute()` accepts MQL (MongoDB Query Language) as a JSON string
- Schema introspection samples documents to infer collection "columns"
- AI generation produces MQL instead of SQL when MongoDB is the target
- Editor switches to JSON mode for MongoDB connections

### AI Provider Abstraction

**File:** `src/main/ai/interface.ts`

```typescript
export type AIProviderType = 'openai' | 'anthropic' | 'gemini' | 'ollama' | 'openrouter';

export interface AIModel {
  id: string;
  name: string;
  maxTokens: number;
  supportsStreaming: boolean;
}

export interface IAIProvider {
  name: AIProviderType;
  models: AIModel[];
  complete(request: AIRequest): Promise<AIResponse>;
  stream(request: AIRequest): AsyncIterable<string>;
  validateKey(apiKey: string): Promise<boolean>;
}

export interface AIRequest {
  systemPrompt: string;
  userPrompt: string;
  model: string;
  maxTokens: number;
  temperature: number;
  stop?: string[];
}

export interface AIResponse {
  content: string;
  model: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}
```

**Provider implementations:**

| Provider | SDK/Client | Notes |
|----------|-----------|-------|
| OpenAI | `openai` npm package | GPT-4o, GPT-4o-mini |
| Anthropic | `@anthropic-ai/sdk` | Claude 4 Sonnet, Haiku |
| Google Gemini | `@google/generative-ai` | Gemini 2.5 Pro, Flash |
| Ollama | HTTP client (fetch) | Local models (Llama, Mistral, etc.) |
| OpenRouter | `openai` with custom baseURL | Gateway to 100+ models |

**OpenRouter integration:**
```typescript
// OpenRouter uses OpenAI-compatible API
const client = new OpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: openRouterKey,
});
```

### IPC Channel Definitions

**File:** `src/shared/types/ipc.ts`

```typescript
// Type-safe IPC channel definitions
export interface IPCChannels {
  // Connections
  'connection:list': () => Promise<SavedConnection[]>;
  'connection:test': (config: ConnectionConfig) => Promise<boolean>;
  'connection:connect': (id: string) => Promise<void>;
  'connection:disconnect': (id: string) => Promise<void>;
  'connection:save': (config: ConnectionConfig) => Promise<void>;
  'connection:delete': (id: string) => Promise<void>;

  // Queries
  'query:execute': (connectionId: string, sql: string) => Promise<QueryResult>;
  'query:cancel': (queryId: string) => Promise<void>;
  'query:explain': (connectionId: string, sql: string) => Promise<QueryResult>;

  // Schema
  'schema:databases': (connectionId: string) => Promise<string[]>;
  'schema:schemas': (connectionId: string, database: string) => Promise<string[]>;
  'schema:tables': (connectionId: string, schema: string) => Promise<TableInfo[]>;
  'schema:columns': (connectionId: string, table: string) => Promise<ColumnInfo[]>;
  'schema:relationships': (connectionId: string, schema: string) => Promise<Relationship[]>;

  // AI
  'ai:generate': (prompt: string, context: SchemaContext) => Promise<string>;
  'ai:autocomplete': (partial: string, context: SchemaContext) => Promise<string[]>;
  'ai:fix': (query: string, error: string, context: SchemaContext) => Promise<string>;
  'ai:optimize': (query: string, context: SchemaContext) => Promise<OptimizeResult>;
  'ai:validate-key': (provider: AIProviderType, apiKey: string) => Promise<boolean>;

  // History
  'history:list': (limit: number, offset: number) => Promise<HistoryEntry[]>;
  'history:search': (query: string) => Promise<HistoryEntry[]>;

  // Settings
  'settings:get': (key: string) => Promise<unknown>;
  'settings:set': (key: string, value: unknown) => Promise<void>;
}
```

---

## AI Context Pipeline

```
User prompt → Schema Context Collector → Prompt Assembler → AI Provider → Response Parser → Editor
                      ↑
        Table/column names + types + FKs
        + Query history (relevant)
        + Naming convention patterns
```

### Context Budget Management

AI APIs have token limits. The context builder prioritizes:

1. **Always include** (highest priority): Target table schemas — columns, types, constraints
2. **Include if space**: Related tables (via foreign keys), table comments
3. **Include if space**: Recent relevant queries from history
4. **Trim if needed**: Column comments, index info, statistics

**Token targets:**
- Autocomplete: <4,000 tokens (speed is critical)
- SQL generation: <8,000 tokens (accuracy is critical)
- Optimization: <12,000 tokens (needs EXPLAIN output + schema)

### Prompt Templates

**SQL Generation (`src/main/ai/prompts/generate.ts`):**
```
SYSTEM: You are a SQL expert. Generate {dialect} SQL based on the user's
natural language request. Use only the tables and columns provided in the
schema context. Return ONLY the SQL query, no explanation.

SCHEMA CONTEXT:
{schema_context}

QUERY HISTORY (recent relevant):
{relevant_history}

USER: {natural_language_request}
```

**Error Fix (`src/main/ai/prompts/fix-error.ts`):**
```
SYSTEM: You are a SQL expert. The user's query produced an error.
Fix the query to resolve the error. Return ONLY the corrected SQL.

DIALECT: {dialect}
SCHEMA CONTEXT: {schema_context}
ORIGINAL QUERY: {query}
ERROR MESSAGE: {error}
```

---

## Security Model

### 1. Credential Storage
- **OS Keychain** via `electron-keytar`
  - macOS: Keychain
  - Windows: Credential Manager
  - Linux: Secret Service (GNOME Keyring / KWallet)
- No plaintext credentials stored anywhere
- AI API keys stored in same keychain

### 2. Electron Security
- `contextIsolation: true` — renderer can't access Node.js
- `nodeIntegration: false` — no require() in renderer
- CSP headers — prevent XSS
- Preload script with `contextBridge` — explicit API surface

### 3. Connection Security
- SSL/TLS enabled by default for all connections
- SSH tunnel support for connections behind firewalls
- Connection timeout and idle disconnect policies

### 4. Query Safety
- Permission roles can restrict to SELECT-only
- Destructive query confirmation (DROP, TRUNCATE, DELETE without WHERE)
- Query timeout configuration

### 5. Privacy
- No telemetry by default (opt-in only)
- No query content transmitted except to user's configured AI provider
- All data stored locally on user's machine

---

## Performance Targets

| Metric | Target |
|--------|--------|
| App startup | < 3 seconds |
| Query result rendering (1k rows) | < 200ms |
| Virtual scroll (100k rows) | Smooth 60fps |
| AI autocomplete latency | < 500ms (300ms debounce + API) |
| Memory usage (typical) | < 200MB |
| Memory usage (100k rows loaded) | < 400MB |
| Default result limit | 1,000 rows (configurable) |

### Performance Strategies
- **Virtual scrolling** — render only visible rows (TanStack Virtual)
- **Streaming exports** — never load full result into memory for export
- **Debounced AI** — 300ms minimum between autocomplete requests
- **Lazy-load Monaco** — largest bundle chunk, loaded on demand
- **Schema caching** — refresh on demand or every 5 minutes
- **Connection pooling** — maintain pools per connection (configurable size)

---

## Database Driver Details

### PostgreSQL (`pg`)
- Schema introspection via `information_schema` and `pg_catalog`
- `EXPLAIN ANALYZE` for query optimization
- Streaming via cursor-based iteration
- Connection pooling via `pg.Pool`

### MySQL (`mysql2`)
- Schema via `information_schema`
- `EXPLAIN` for optimization
- Streaming via `connection.query().stream()`
- Connection pooling built-in

### MariaDB (`mariadb`)
- Same `information_schema` as MySQL
- MariaDB-specific extensions (sequences, system versioning)
- Native connection pooling

### MongoDB (`mongodb`)
- Schema inferred by sampling N documents per collection
- No `information_schema` — use `listCollections()` + `aggregate()`
- MQL execution via collection methods
- Editor switches to JSON mode

### ClickHouse (`@clickhouse/client`)
- Schema via `system.tables` and `system.columns`
- `EXPLAIN` for optimization
- HTTP-based protocol
- Streaming via result set iteration

### Microsoft SQL Server (`tedious`)
- Schema via `INFORMATION_SCHEMA` and `sys.*` views
- `SET SHOWPLAN_XML ON` for execution plans
- TDS protocol
- Connection pooling via `tedious-connection-pool`
