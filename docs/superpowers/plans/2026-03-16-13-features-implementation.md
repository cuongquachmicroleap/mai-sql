# 13 Features Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add 13 major features to MAI SQL: AI Query Assistant, Query History, Data Export, MySQL Driver, Query Snippets, Dark/Light Theme, Data Editing, SSH Tunnel, EXPLAIN Visualization, Multiple Result Sets, Connection Groups, Auto-Complete Enhancements, and Database Diff.

**Architecture:** Each feature is self-contained with its own IPC channels, stores, and UI components. Features share the existing driver factory pattern, Zustand stores, and IPC bridge. New IPC channels are added to IPCChannels interface and bridged through preload.

**Tech Stack:** Electron + React 19 + TypeScript + Zustand + Monaco Editor + TanStack Table + Tailwind CSS. New deps: mysql2 (MySQL driver), ssh2 (SSH tunnels), xlsx (Excel export).

---

## File Structure Overview

### New Files
```
src/shared/types/
  ai.ts                          - AI provider config, chat message types
  history.ts                     - Query history entry types
  snippet.ts                     - Snippet types
  diff.ts                        - Schema diff result types

src/main/
  drivers/mysql.ts               - MySQL/MariaDB driver (IDataSource)
  ipc/ai.ts                      - AI IPC handlers
  ipc/history.ts                 - Query history IPC handlers
  ipc/export.ts                  - Export IPC handlers (CSV, XLSX, SQL INSERT)
  ipc/ssh-tunnel.ts              - SSH tunnel management
  ipc/snippets.ts                - Snippet CRUD IPC
  ipc/settings.ts                - App settings IPC
  ipc/diff.ts                    - Schema diff IPC
  managers/history-manager.ts    - Query history persistence (SQLite)
  managers/ai-manager.ts         - AI provider abstraction
  managers/snippet-manager.ts    - Snippet CRUD persistence
  managers/settings-manager.ts   - App settings persistence (theme, AI keys)
  managers/ssh-manager.ts        - SSH tunnel lifecycle

src/renderer/src/
  stores/history-store.ts        - Query history state
  stores/settings-store.ts       - App settings (theme, AI config)
  stores/snippet-store.ts        - Snippets state
  components/
    ai/AIChatPanel.tsx           - AI chat sidebar panel
    ai/AIToolbar.tsx             - AI buttons in editor toolbar
    history/QueryHistory.tsx     - History list with search
    snippets/SnippetPanel.tsx    - Snippet browser/editor
    settings/SettingsPanel.tsx   - Settings page (AI keys, theme, etc.)
    settings/ThemeToggle.tsx     - Theme switch component
    explain/ExplainTree.tsx      - Visual EXPLAIN tree
    diff/SchemaDiff.tsx          - Schema diff view
    results/DataEditor.tsx       - Inline cell editing overlay
```

### Modified Files
```
src/shared/types/ipc.ts         - Add all new IPC channels
src/shared/types/connection.ts  - Add color, group fields
src/preload/index.ts            - Bridge new IPC channels
src/main/index.ts               - Import new IPC modules
src/main/drivers/factory.ts     - Add MySQL driver case
src/main/drivers/interface.ts   - Add getDefaultDatabase() to interface
src/main/ipc/queries.ts         - Record history on execute
src/renderer/src/
  stores/editor-store.ts        - Add history tracking, multi-result
  stores/connection-store.ts    - Add color, group fields
  components/layout/MainLayout.tsx    - Add AI panel, settings, theme
  components/editor/EditorToolbar.tsx - Add AI buttons, snippet trigger
  components/editor/QueryEditor.tsx   - Enhanced autocomplete
  components/results/ResultsToolbar.tsx - Enhanced export menu
  components/results/ResultsGrid.tsx   - Inline editing support
  components/sidebar/ConnectionList.tsx - Color coding, groups
  components/settings/ConnectionForm.tsx - SSH tunnel fields
  components/layout/StatusBar.tsx       - Theme-aware colors
  App.tsx                               - Theme provider wrapper
  main.tsx                              - Theme CSS class
package.json                    - New dependencies
```

---

## Chunk 1: Foundation - Types, Settings, Theme (Features 6, partial 1)

### Task 1.1: Add new shared types

**Files:**
- Create: `src/shared/types/ai.ts`
- Create: `src/shared/types/history.ts`
- Create: `src/shared/types/snippet.ts`
- Create: `src/shared/types/diff.ts`
- Modify: `src/shared/types/connection.ts`
- Modify: `src/shared/types/ipc.ts`

- [ ] **Step 1: Create AI types** (ai.ts)
- [ ] **Step 2: Create history types** (history.ts)
- [ ] **Step 3: Create snippet types** (snippet.ts)
- [ ] **Step 4: Create diff types** (diff.ts)
- [ ] **Step 5: Update connection types** - add color and group fields
- [ ] **Step 6: Update IPC channels** - add all new channels
- [ ] **Step 7: Commit**

### Task 1.2: Settings manager and theme support

**Files:**
- Create: `src/main/managers/settings-manager.ts`
- Create: `src/main/ipc/settings.ts`
- Create: `src/renderer/src/stores/settings-store.ts`
- Modify: `src/renderer/src/App.tsx`
- Modify: `src/main/index.ts`
- Modify: `src/preload/index.ts`

- [ ] **Step 1: Create settings manager** (electron-store based)
- [ ] **Step 2: Create settings IPC handler**
- [ ] **Step 3: Create settings store** (renderer, Zustand)
- [ ] **Step 4: Update App.tsx** to load settings on mount
- [ ] **Step 5: Add light theme CSS** variables
- [ ] **Step 6: Update preload and main index**
- [ ] **Step 7: Commit**

---

## Chunk 2: Query History (Feature 2)

### Task 2.1: History manager (main process)

**Files:**
- Create: `src/main/managers/history-manager.ts`
- Create: `src/main/ipc/history.ts`
- Modify: `src/main/ipc/queries.ts`

- [ ] **Step 1: Create history manager** using better-sqlite3
- [ ] **Step 2: Create history IPC handlers**
- [ ] **Step 3: Wire history recording** into query execute IPC
- [ ] **Step 4: Update preload and main index**
- [ ] **Step 5: Commit**

### Task 2.2: History UI (renderer)

**Files:**
- Create: `src/renderer/src/stores/history-store.ts`
- Create: `src/renderer/src/components/history/QueryHistory.tsx`
- Modify: `src/renderer/src/components/layout/MainLayout.tsx`

- [ ] **Step 1: Create history store**
- [ ] **Step 2: Create QueryHistory component**
- [ ] **Step 3: Add History button to activity bar**
- [ ] **Step 4: Commit**

---

## Chunk 3: Data Export (Feature 3)

### Task 3.1: Export IPC handlers

**Files:**
- Create: `src/main/ipc/export.ts`

- [ ] **Step 1: Install xlsx dependency**
- [ ] **Step 2: Create export IPC handlers** (CSV, XLSX, SQL INSERT)
- [ ] **Step 3: Update preload and main index**
- [ ] **Step 4: Commit**

### Task 3.2: Enhanced export UI

**Files:**
- Modify: `src/renderer/src/components/results/ResultsToolbar.tsx`

- [ ] **Step 1: Expand export dropdown** - CSV, JSON, Excel, SQL INSERT, Copy TSV
- [ ] **Step 2: Commit**

---

## Chunk 4: MySQL/MariaDB Driver (Feature 4)

### Task 4.1: MySQL driver implementation

**Files:**
- Create: `src/main/drivers/mysql.ts`
- Modify: `src/main/drivers/factory.ts`
- Modify: `src/main/drivers/interface.ts`

- [ ] **Step 1: Install mysql2**
- [ ] **Step 2: Implement MySQLDriver** (IDataSource)
- [ ] **Step 3: Update factory.ts** - add mysql/mariadb case
- [ ] **Step 4: Add getDefaultDatabase()** to IDataSource interface
- [ ] **Step 5: Commit**

---

## Chunk 5: AI Query Assistant (Feature 1)

### Task 5.1: AI manager and IPC

**Files:**
- Create: `src/main/managers/ai-manager.ts`
- Create: `src/main/ipc/ai.ts`

- [ ] **Step 1: Create AI manager** - OpenAI, Anthropic, Ollama via fetch
- [ ] **Step 2: Create AI IPC handlers**
- [ ] **Step 3: Update preload and main index**
- [ ] **Step 4: Commit**

### Task 5.2: AI Chat Panel UI

**Files:**
- Create: `src/renderer/src/components/ai/AIChatPanel.tsx`
- Create: `src/renderer/src/components/ai/AIToolbar.tsx`
- Modify: `src/renderer/src/components/editor/EditorToolbar.tsx`
- Modify: `src/renderer/src/components/layout/MainLayout.tsx`

- [ ] **Step 1: Create AIChatPanel** - chat with message history
- [ ] **Step 2: Create AIToolbar buttons** - Ask AI, Explain, Fix Error
- [ ] **Step 3: Add AI buttons to EditorToolbar**
- [ ] **Step 4: Add AI panel toggle to MainLayout**
- [ ] **Step 5: Commit**

---

## Chunk 6: Query Snippets (Feature 5)

### Task 6.1: Snippet manager and IPC

**Files:**
- Create: `src/main/managers/snippet-manager.ts`
- Create: `src/main/ipc/snippets.ts`

- [ ] **Step 1: Create snippet manager** with built-in + user snippets
- [ ] **Step 2: Create snippet IPC handlers**
- [ ] **Step 3: Update preload and main index**
- [ ] **Step 4: Commit**

### Task 6.2: Snippet UI

**Files:**
- Create: `src/renderer/src/stores/snippet-store.ts`
- Create: `src/renderer/src/components/snippets/SnippetPanel.tsx`
- Modify: `src/renderer/src/components/layout/MainLayout.tsx`

- [ ] **Step 1: Create snippet store**
- [ ] **Step 2: Create SnippetPanel**
- [ ] **Step 3: Add Snippets button to activity bar**
- [ ] **Step 4: Commit**

---

## Chunk 7: SSH Tunnel (Feature 8)

### Task 7.1: SSH tunnel manager

**Files:**
- Create: `src/main/managers/ssh-manager.ts`
- Create: `src/main/ipc/ssh-tunnel.ts`
- Modify: `src/main/managers/connection-manager.ts`
- Modify: `src/renderer/src/components/settings/ConnectionForm.tsx`

- [ ] **Step 1: Install ssh2**
- [ ] **Step 2: Create SSH manager**
- [ ] **Step 3: Integrate SSH into connection flow**
- [ ] **Step 4: Create SSH IPC handlers**
- [ ] **Step 5: Update ConnectionForm** with SSH fields
- [ ] **Step 6: Update preload and main index**
- [ ] **Step 7: Commit**

---

## Chunk 8: Data Editing (Feature 7)

### Task 8.1: Inline cell editing

**Files:**
- Create: `src/renderer/src/components/results/DataEditor.tsx`
- Modify: `src/renderer/src/components/results/ResultsGrid.tsx`
- Modify: `src/renderer/src/stores/editor-store.ts`

- [ ] **Step 1: Create DataEditor component** - click to edit, ESC cancel
- [ ] **Step 2: Track pending changes** in editor store
- [ ] **Step 3: Add Apply/Discard toolbar buttons**
- [ ] **Step 4: Generate SQL from pending changes** with preview
- [ ] **Step 5: Commit**

---

## Chunk 9: EXPLAIN Visualization (Feature 9)

### Task 9.1: Visual EXPLAIN tree

**Files:**
- Create: `src/renderer/src/components/explain/ExplainTree.tsx`
- Modify: `src/renderer/src/components/editor/EditorToolbar.tsx`
- Modify: `src/renderer/src/stores/editor-store.ts`

- [ ] **Step 1: Add EXPLAIN ANALYZE JSON** execution
- [ ] **Step 2: Create ExplainTree component** - tree with cost coloring
- [ ] **Step 3: Add Visual tab** in results panel
- [ ] **Step 4: Commit**

---

## Chunk 10: Multiple Result Sets (Feature 10)

### Task 10.1: Multi-result support

**Files:**
- Modify: `src/shared/types/query.ts`
- Modify: `src/main/drivers/postgresql.ts`
- Modify: `src/renderer/src/stores/editor-store.ts`
- Modify: `src/renderer/src/components/results/ResultsToolbar.tsx`

- [ ] **Step 1: Update QueryResult type** for multi-statement
- [ ] **Step 2: Split multi-statement queries** in driver
- [ ] **Step 3: Add result set tabs** in toolbar
- [ ] **Step 4: Commit**

---

## Chunk 11: Connection Groups and Colors (Feature 11)

### Task 11.1: Connection color coding and groups

**Files:**
- Modify: `src/renderer/src/components/sidebar/ConnectionList.tsx`
- Modify: `src/renderer/src/components/settings/ConnectionForm.tsx`
- Modify: `src/renderer/src/components/layout/StatusBar.tsx`

- [ ] **Step 1: Add color picker** to ConnectionForm
- [ ] **Step 2: Add group selector** to ConnectionForm
- [ ] **Step 3: Update ConnectionList** - group by name, color dot
- [ ] **Step 4: Add production warning banner**
- [ ] **Step 5: Update StatusBar** with color dot
- [ ] **Step 6: Commit**

---

## Chunk 12: Auto-Complete Enhancements (Feature 12)

### Task 12.1: JOIN suggestions and alias tracking

**Files:**
- Modify: `src/renderer/src/components/editor/QueryEditor.tsx`

- [ ] **Step 1: Add JOIN auto-complete** - suggest FK-based conditions
- [ ] **Step 2: Track table aliases** - parse FROM/JOIN clauses
- [ ] **Step 3: Add WHERE hints** - suggest indexed columns first
- [ ] **Step 4: Commit**

---

## Chunk 13: Database Diff (Feature 13)

### Task 13.1: Schema diff backend

**Files:**
- Create: `src/main/ipc/diff.ts`

- [ ] **Step 1: Create diff IPC handlers**
- [ ] **Step 2: Generate migration SQL** from diff
- [ ] **Step 3: Update preload and main index**
- [ ] **Step 4: Commit**

### Task 13.2: Schema diff UI

**Files:**
- Create: `src/renderer/src/components/diff/SchemaDiff.tsx`
- Modify: `src/renderer/src/components/layout/MainLayout.tsx`

- [ ] **Step 1: Create SchemaDiff component**
- [ ] **Step 2: Add Diff button to activity bar**
- [ ] **Step 3: Commit**

---

## Chunk 14: Settings Panel and Final Integration

### Task 14.1: Settings panel

**Files:**
- Create: `src/renderer/src/components/settings/SettingsPanel.tsx`
- Create: `src/renderer/src/components/settings/ThemeToggle.tsx`
- Modify: `src/renderer/src/components/layout/MainLayout.tsx`

- [ ] **Step 1: Create ThemeToggle**
- [ ] **Step 2: Create SettingsPanel** - Appearance, AI Config, Editor, Data sections
- [ ] **Step 3: Wire Settings button** in activity bar
- [ ] **Step 4: Commit**

### Task 14.2: Preload bridge - wire ALL new IPC channels

**Files:**
- Modify: `src/preload/index.ts`

- [ ] **Step 1: Add all new IPC channel bridges**
- [ ] **Step 2: Commit**

### Task 14.3: Main process imports

**Files:**
- Modify: `src/main/index.ts`

- [ ] **Step 1: Import all new IPC modules**
- [ ] **Step 2: Commit**

---

## Implementation Priority Order

Execute chunks in this order for maximum incremental value:

1. **Chunk 14.4** - Install all deps first
2. **Chunk 1** (Foundation) - types, settings, theme
3. **Chunk 14.2-14.3** - Wire preload and main imports
4. **Chunk 2** (Query History) - high user value
5. **Chunk 3** (Data Export) - high user value
6. **Chunk 4** (MySQL Driver) - doubles user base
7. **Chunk 5** (AI Assistant) - core differentiator
8. **Chunk 7** (SSH Tunnel) - production access
9. **Chunk 6** (Snippets) - productivity boost
10. **Chunk 11** (Connection Groups) - UX improvement
11. **Chunk 12** (Auto-Complete) - editor enhancement
12. **Chunk 9** (EXPLAIN Viz) - power user feature
13. **Chunk 10** (Multi Results) - quality of life
14. **Chunk 8** (Data Editing) - complex feature
15. **Chunk 13** (Database Diff) - advanced feature
16. **Chunk 14.1** (Settings Panel) - final integration
