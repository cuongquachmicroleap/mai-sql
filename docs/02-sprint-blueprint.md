# MAI SQL — Sprint Blueprint (6 Sprints × 2 Weeks)

## Sprint Dependency Graph

```
Sprint 1 (Foundation: Electron + PG + Editor)
  ├──→ Sprint 2 (Multi-DB + Editor Polish)
  │       ├──→ Sprint 4 (Extended DBs + ER + Export)
  └──→ Sprint 3 (AI Core)
              │
              └──→ Sprint 5 (AI Advanced + Polish)
                        │
                        └──→ Sprint 6 (Security + Launch)
```

Sprints 2 and 3 can run in parallel with two squads.

---

## Sprint 1: Foundation — "Connect and Query"

**Duration:** Weeks 1-2
**Goal:** Electron app, connect to PostgreSQL, write SQL, execute, see results.

### User Stories

| ID | Story | Acceptance Criteria |
|----|-------|-------------------|
| US-1.1 | Electron app scaffolding with React frontend | App launches, dev mode with hot reload, main+renderer process architecture |
| US-1.2 | Create database connection (PostgreSQL) | Form: host/port/db/user/pass; test connection button; save encrypted to OS keychain (electron-keytar); connection list in sidebar |
| US-1.3 | Monaco SQL editor with PG syntax highlighting | Monaco loads with SQL mode; PG keywords highlighted; basic keyword completion |
| US-1.4 | Execute query + results grid | Ctrl/Cmd+Enter executes; virtual-scroll table (TanStack); column headers from result; execution time; error display |
| US-1.5 | Schema explorer sidebar | Tree: databases > schemas > tables > columns (with types); click table → `SELECT * FROM table LIMIT 100` |
| US-1.6 | i18n setup (English + Vietnamese) | react-i18next configured; language switcher; all UI strings externalized |

### Technical Deliverables
- Electron + Vite + React 19 + TypeScript project scaffolding
- Main process: IPC handlers for DB operations
- Renderer process: React UI with TailwindCSS + shadcn/ui
- PostgreSQL driver integration (`pg`) in main process
- Monaco Editor integration (`@monaco-editor/react`)
- Connection management with `electron-keytar` (OS keychain)
- Query execution IPC pipeline: renderer → main → pg → result → renderer
- i18n setup with `react-i18next` + JSON translation files

### Dependencies
None (first sprint)

---

## Sprint 2: Multi-DB + Editor Polish

**Duration:** Weeks 3-4
**Goal:** MySQL/MariaDB support. Tabs, history, shortcuts.

### User Stories

| ID | Story | Acceptance Criteria |
|----|-------|-------------------|
| US-2.1 | MySQL + MariaDB connections | DB type selector in form; `mysql2` + `mariadb` drivers; dialect-aware highlighting |
| US-2.2 | Database driver abstraction layer | `IDataSource` interface; all 3 drivers implement it; factory pattern for instantiation |
| US-2.3 | Multi-tab query editor | Tab bar: add/close/rename; independent state per tab; tabs persist across restart |
| US-2.4 | Query history | History panel: last 500 queries with timestamp/db/time/status; search/filter; click to load |
| US-2.5 | Keyboard shortcuts | Cmd+Enter execute; Cmd+T new tab; Cmd+W close tab; Cmd+K command palette stub |
| US-2.6 | Connection management improvements | Edit/delete connections; duplicate connection; connect/disconnect toggle; connection status indicator |

### Technical Deliverables
- `IDataSource` interface (`src/main/drivers/interface.ts`)
- MySQL (`mysql2`) + MariaDB (`mariadb`) driver wrappers implementing `IDataSource`
- Driver factory: `ConnectionConfig → IDataSource` instance
- Tab state management (Zustand store)
- Query history storage (`electron-store` or SQLite via `better-sqlite3`)
- Keyboard shortcut system

### Dependencies
Sprint 1 (connection management, query execution pipeline)

---

## Sprint 3: AI Integration Core — "Bring Your Own AI"

**Duration:** Weeks 5-6
**Goal:** Configure AI provider + key, NL→SQL, autocomplete, error fix.

### User Stories

| ID | Story | Acceptance Criteria |
|----|-------|-------------------|
| US-3.1 | AI settings page | Provider selector (OpenAI/Anthropic/Gemini/Ollama/OpenRouter); API key input with validation test call; model selector per provider; key encrypted in OS keychain |
| US-3.2 | NL → SQL generation | Cmd+I opens prompt input; schema context sent to AI; generated SQL in editor with diff view; accept/reject |
| US-3.3 | AI autocomplete in editor | Suggestions after 300ms debounce; table names, columns, AI clause completions; toggle on/off in settings |
| US-3.4 | AI error fix | "Fix with AI" button on error messages; AI receives error + query + schema; suggested fix as diff; accept/reject |
| US-3.5 | Schema context collector | Extracts tables/columns/types/FKs for current connection; cached locally; refreshes on reconnect or manual trigger |

### Technical Deliverables
- `IAIProvider` interface
- Provider implementations:
  - OpenAI (`openai` SDK)
  - Anthropic (`@anthropic-ai/sdk`)
  - Google Gemini (`@google/generative-ai`)
  - Ollama (HTTP client to local server)
  - OpenRouter (OpenAI-compatible API with custom baseURL)
- Schema context collector (queries `information_schema` for SQL DBs)
- Prompt templates: `generate.ts`, `autocomplete.ts`, `fix-error.ts`
- Streaming response handler (SSE/streaming for real-time AI output)
- Monaco `CompletionItemProvider` integration for AI autocomplete
- AI settings UI with provider/model/key management

### Dependencies
Sprint 1 (query execution for testing), Sprint 2 (multi-db for schema context across dialects)

---

## Sprint 4: Extended DBs + Visualization

**Duration:** Weeks 7-8
**Goal:** MongoDB, ClickHouse, MSSQL. ER diagrams. Export. Inline editing.

### User Stories

| ID | Story | Acceptance Criteria |
|----|-------|-------------------|
| US-4.1 | MongoDB support | `mongodb` driver; editor switches to JSON/MQL mode; schema inferred from document sampling; AI generates MQL |
| US-4.2 | ClickHouse support | `@clickhouse/client` driver; ClickHouse SQL dialect highlighting |
| US-4.3 | MSSQL support | `tedious` driver; T-SQL dialect highlighting |
| US-4.4 | ER diagram visualization | React Flow canvas; tables as nodes with columns; FK lines; auto-layout; zoom/pan; export PNG/SVG |
| US-4.5 | Export results | CSV, JSON, SQL INSERT formats; large result streaming export; file save dialog |
| US-4.6 | Inline data editing | Double-click cell to edit; pending changes panel; review generated SQL; commit/discard |

### Technical Deliverables
- MongoDB, ClickHouse, MSSQL drivers implementing `IDataSource`
- MongoDB MQL mode for Monaco (JSON-like syntax)
- ER diagram renderer using React Flow
- FK/relationship detection queries per DB type
- Export pipeline (streaming for large datasets)
- Inline edit with change tracking + SQL generation

### Dependencies
Sprint 2 (driver abstraction layer), Sprint 3 (AI context needs all DB types)

---

## Sprint 5: Advanced AI + Polish

**Duration:** Weeks 9-10
**Goal:** AI optimization, project context indexing, app polish.

### User Stories

| ID | Story | Acceptance Criteria |
|----|-------|-------------------|
| US-5.1 | AI query optimization | "Optimize" button; AI receives query + schema + EXPLAIN output; optimized query with explanation; side-by-side diff; index suggestions |
| US-5.2 | Project context indexing | Background indexer: schema, query history, naming patterns; stored in local SQLite; AI prompts include relevant context; re-index on schema change |
| US-5.3 | Saved queries / favorites | Save query with name/description; organize in folders; search saved queries; quick-run from sidebar |
| US-5.4 | Dark/light theme | Theme toggle; TailwindCSS dark mode; Monaco theme switching; persist preference |
| US-5.5 | App polish | System tray with quick-connect; native menu bar; auto-update (electron-updater); window state persistence |

### Technical Deliverables
- AI optimization pipeline (query → EXPLAIN → AI analysis → suggestion)
- Project context indexing system (schema + history + patterns, stored in SQLite)
- Saved queries CRUD with folder organization
- Theme system (TailwindCSS dark mode + Monaco themes)
- Electron system tray, native menu, auto-update, window state

### Dependencies
Sprint 3 (AI integration layer), Sprint 4 (all database drivers for context indexing)

---

## Sprint 6: Security, Performance, Launch

**Duration:** Weeks 11-12
**Goal:** Permissions, performance, onboarding, release.

### User Stories

| ID | Story | Acceptance Criteria |
|----|-------|-------------------|
| US-6.1 | Connection permissions | Roles per connection: viewer (SELECT), editor (DML), admin (DDL+DML); query validation before execution; visual role indicator |
| US-6.2 | SSL/TLS + SSH tunnel | SSL toggle per connection (default on); SSH tunnel config (host/port/key/password); connection through bastion hosts |
| US-6.3 | Large result performance | Virtual scroll smooth at 100k rows; pagination with configurable page size; memory <200MB for large results |
| US-6.4 | Onboarding wizard | First-launch: welcome → add AI key → add connection → run first query; skip option; sample DB option |
| US-6.5 | CI/CD + release | GitHub Actions: lint, test, build for macOS/Win/Linux; auto-update feed; GitHub Releases; code signing |
| US-6.6 | Documentation | README with screenshots; CONTRIBUTING.md; architecture docs; getting started guide |

### Technical Deliverables
- Permission management system (role-based query validation)
- SSL/TLS configuration per connection + SSH tunnel support
- Virtual scrolling and result streaming optimization
- Onboarding wizard component
- CI/CD pipeline (GitHub Actions: lint, test, build for 3 platforms)
- electron-builder configuration for macOS DMG, Windows NSIS, Linux AppImage
- Auto-update via electron-updater + GitHub Releases
- Documentation (README, CONTRIBUTING, architecture)

### Dependencies
Sprint 5 (app polish, all features complete)
