# MAI SQL — Verification Plan

## Per-Sprint Testing

### Sprint 1: Foundation

1. Launch Electron app — verify window opens, dev mode hot reload works
2. Connect to local PostgreSQL — test connection button succeeds
3. Execute `SELECT * FROM pg_tables` — verify results render in grid
4. Check schema explorer shows databases > schemas > tables > columns
5. Switch language to Vietnamese — verify all UI strings translate
6. Close and reopen app — verify saved connection persists

### Sprint 2: Multi-DB + Editor

1. Connect to MySQL database — verify MySQL-specific syntax highlighting
2. Connect to MariaDB database — verify connection and queries work
3. Open 3 tabs with different queries — verify independent state
4. Execute a query — verify it appears in query history
5. Restart app — verify tabs and history persist
6. Test keyboard shortcuts: Cmd+Enter, Cmd+T, Cmd+W

### Sprint 3: AI Core

1. Configure OpenAI key — verify validation test call succeeds
2. Configure Anthropic key — verify validation succeeds
3. Type "show all users created in the last 7 days" → verify generated SQL references correct tables/columns from schema
4. Type `SELECT * FORM users` (typo) → execute → click "Fix with AI" → verify corrected query
5. Type `SELECT u.` in editor → verify AI autocomplete suggests column names from `users` table
6. Test with Ollama (if available) — verify local model works
7. Test with OpenRouter — verify multi-model gateway works

### Sprint 4: Extended DBs + Visualization

1. Connect to MongoDB — verify editor switches to JSON/MQL mode
2. Run MongoDB find query — verify results display
3. Connect to ClickHouse — verify ClickHouse SQL dialect works
4. Connect to MSSQL — verify T-SQL queries execute
5. Open ER diagram view — verify tables appear as nodes with FK relationship lines
6. Export results as CSV — verify file contents match query results
7. Double-click a cell → edit → review generated SQL → commit change

### Sprint 5: Advanced AI + Polish

1. Write a slow query with missing index → click "Optimize" → verify AI suggests index and optimized query
2. Verify project context indexer runs and stores schema metadata
3. Save a query with name and description → find it in saved queries sidebar
4. Toggle dark/light theme → verify Monaco editor and all UI components switch
5. Close app → verify system tray icon remains → reopen from tray
6. Check auto-update mechanism (with test update server)

### Sprint 6: Security + Launch

1. Set connection permission to "viewer" → attempt INSERT → verify blocked with clear message
2. Enable SSL for PostgreSQL connection → verify secure connection
3. Configure SSH tunnel → verify connection through bastion
4. Load 100k row result → scroll smoothly → verify memory stays under 400MB
5. Fresh install → complete onboarding wizard → verify first query succeeds
6. Build for macOS → verify DMG installs and launches
7. Build for Windows → verify NSIS installer works
8. Build for Linux → verify AppImage launches

---

## Testing Strategy

### Unit Tests (Vitest)

**Target coverage: 80%+ for core modules**

| Module                  | Key Test Cases                                               |
| ----------------------- | ------------------------------------------------------------ |
| `drivers/interface.ts`  | Type validation, error handling                              |
| `drivers/postgresql.ts` | Connection, query execution, schema introspection (mocked)   |
| `drivers/mysql.ts`      | Same pattern as PostgreSQL                                   |
| `drivers/factory.ts`    | Correct driver instantiation per config type                 |
| `ai/interface.ts`       | Request/response validation                                  |
| `ai/context-builder.ts` | Context budget management, priority ordering, token counting |
| `ai/prompts/*.ts`       | Prompt template generation with various inputs               |
| `security/keychain.ts`  | Store/retrieve/delete credentials                            |
| `storage/history.ts`    | CRUD operations, search, pagination                          |

### Integration Tests (Vitest + Docker)

**Requires Docker containers for real database connections**

```yaml
# docker-compose.test.yml
services:
  postgres:
    image: postgres:16
    ports: ['5433:5432']
  mysql:
    image: mysql:8
    ports: ['3307:3306']
  mariadb:
    image: mariadb:11
    ports: ['3308:3306']
  mongodb:
    image: mongo:7
    ports: ['27018:27017']
  clickhouse:
    image: clickhouse/clickhouse-server:24
    ports: ['8124:8123']
  mssql:
    image: mcr.microsoft.com/mssql/server:2022-latest
    ports: ['1434:1433']
```

| Test Suite              | Scope                                                            |
| ----------------------- | ---------------------------------------------------------------- |
| PostgreSQL integration  | Real connection, DDL, DML, schema introspection, EXPLAIN         |
| MySQL integration       | Same as PostgreSQL                                               |
| MariaDB integration     | Same + MariaDB-specific features                                 |
| MongoDB integration     | Connection, MQL execution, collection listing, document sampling |
| ClickHouse integration  | Connection, query, system table introspection                    |
| MSSQL integration       | Connection, T-SQL, sys.\* views introspection                    |
| AI provider integration | Validate key, generate SQL, autocomplete (requires API keys)     |

### E2E Tests (Playwright for Electron)

**Critical user flows:**

1. **Connection flow:** Launch app → create connection → test → save → connect → see schema
2. **Query flow:** Write SQL → execute → see results → export CSV
3. **AI flow:** Configure AI key → NL prompt → accept generated SQL → execute
4. **Multi-DB flow:** Connect PG in tab 1 → connect MySQL in tab 2 → switch between
5. **History flow:** Execute queries → open history → search → reload past query
6. **Settings flow:** Change AI provider → change language → change theme

### Performance Tests

| Test                       | Tool                  | Target       |
| -------------------------- | --------------------- | ------------ |
| App startup time           | Custom timing         | < 3s         |
| 1k rows rendering          | Playwright timing     | < 200ms      |
| 100k rows scroll           | Playwright + FPS      | 60fps smooth |
| Memory under load          | process.memoryUsage() | < 400MB      |
| AI autocomplete round-trip | Custom timing         | < 500ms      |

---

## CI/CD Pipeline

### PR Checks (`.github/workflows/ci.yml`)

```
Trigger: Push to PR

Steps:
1. Lint (ESLint + Prettier check)
2. Type check (tsc --noEmit)
3. Unit tests (Vitest)
4. Integration tests (Docker-based, if CI has Docker)
5. Build check (electron-vite build)
```

### Release (`.github/workflows/release.yml`)

```
Trigger: Git tag v*

Steps:
1. All CI checks pass
2. Build for macOS (DMG, universal binary)
3. Build for Windows (NSIS installer)
4. Build for Linux (AppImage, .deb)
5. Code signing (macOS notarization, Windows code signing)
6. Create GitHub Release with assets
7. Update auto-update feed
```

---

## Critical Files to Create First (Sprint 1)

Priority order for Sprint 1 implementation:

1. `electron.vite.config.ts` — Electron + Vite build configuration
2. `src/main/index.ts` — Electron main process entry
3. `src/preload/index.ts` — Secure contextBridge setup
4. `src/shared/types/ipc.ts` — Type-safe IPC channel definitions
5. `src/main/drivers/interface.ts` — IDataSource interface (architectural foundation)
6. `src/main/drivers/postgresql.ts` — First driver implementation
7. `src/renderer/components/editor/QueryEditor.tsx` — Monaco wrapper
8. `src/renderer/components/results/ResultsGrid.tsx` — Virtual scroll data grid
9. `src/renderer/components/sidebar/DatabaseTree.tsx` — Schema explorer
10. `src/renderer/i18n/config.ts` — i18n initialization
