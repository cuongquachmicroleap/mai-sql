# MAI SQL — Product Analysis

## Overview

**Problem:** Existing SQL clients are either feature-bloated (DBeaver, DataGrip) or AI-limited (TablePlus, Beekeeper). AI-powered tools like Chat2DB lock users into specific AI providers. There's no lightweight, AI-first SQL client that lets users bring their own AI key with deep contextual understanding of their databases.

**Goal:** Build MAI SQL — an AI-native, multi-database desktop SQL client (like DBeaver but AI-first) with BYOK (Bring Your Own Key) AI. Support MySQL, MariaDB, PostgreSQL, MongoDB, ClickHouse, and Microsoft SQL Server.

**Key Decisions:**
- **Platform:** Desktop only (Electron)
- **AI Providers:** OpenAI, Anthropic (Claude), Google Gemini, Ollama (local), OpenRouter
- **Language:** Multi-language (i18n) — English + Vietnamese
- **License:** Open Source (MIT)

---

## Target Users

| Persona | Description | Key Need |
|---------|-------------|----------|
| **Solo Dev** | Freelancer, 2-3 projects, cost-sensitive | Fast queries, AI autocomplete, no subscription |
| **Startup Engineer** | Backend eng, multi-DB (PG + Mongo + CH) | One tool for all databases, AI optimization |
| **Data Analyst** | Knows basic SQL, struggles with JOINs | NL-to-SQL generation, ER diagrams |
| **DBA/Ops Lead** | Manages permissions, monitors perf | AI optimization with explanations, BYOK security |

### Persona Details

#### Solo Dev Sam
- Works across 2-3 projects with different databases
- Needs quick queries, schema exploration, and occasional complex joins
- Cost-sensitive; dislikes subscriptions (rules out DataGrip at $229/year)
- Wants AI to help write queries faster, not replace understanding
- Current tools: TablePlus, DBeaver, or terminal clients

#### Startup Engineer Priya
- Manages PostgreSQL in production, MongoDB for analytics, ClickHouse for events
- Needs multi-database support in one tool
- Wants AI optimization to catch slow queries before they hit production
- Values team collaboration features (shared queries, permissions)
- Current tools: DataGrip or pgAdmin + Compass + separate ClickHouse UI

#### Data Analyst Marco
- Writes SELECT queries but struggles with JOINs and subqueries
- Highest AI dependency: natural language to SQL is the killer feature
- Needs visual ER diagrams to understand schema relationships
- Current tools: Metabase, Retool, or asks engineers to write queries

#### DBA/Ops Lead Chen
- Manages permissions, monitors query performance
- Needs AI optimization suggestions with explanations
- Values security: BYOK means credentials never leave the org
- Wants to run locally (desktop app)
- Current tools: DBeaver, native database tools

---

## Value Proposition

> "The AI-native SQL client — bring your own key, your own database, your own workflow. No subscriptions, no lock-in."

**Pillars:**
1. **AI-first** — autocomplete, generate, fix, optimize — all context-aware
2. **BYOK** — OpenAI, Anthropic, Gemini, Ollama, OpenRouter. You control cost and privacy
3. **Multi-database** — 6 databases, one unified interface
4. **Project context** — AI learns your schema, naming conventions, query patterns
5. **Open source** — MIT license, community-driven

---

## Feature Priority (MoSCoW)

### Must Have (MVP — Sprints 1-3)
- Connect to PostgreSQL, MySQL, MariaDB
- Monaco-based SQL editor with syntax highlighting
- Query execution + result table (virtual scroll)
- Database/schema/table explorer sidebar
- BYOK AI config (OpenAI, Anthropic, Gemini, Ollama, OpenRouter)
- AI SQL generation from natural language
- AI autocomplete (context-aware)
- Connection management (save/edit/delete, encrypted via OS keychain)
- AI error fix suggestions
- i18n support (English + Vietnamese)

### Should Have (v1.1 — Sprints 4-5)
- MongoDB, ClickHouse, MSSQL support
- AI SQL optimization with explanation
- ER diagram / relationship visualization
- Query history + saved queries
- Export results (CSV, JSON, SQL)
- Multiple query tabs
- Inline data editing (INSERT, UPDATE, DELETE via UI)

### Could Have (v1.2+)
- Permission management (role-based)
- Project context indexing (full schema + history for AI)
- Team features (shared connections/queries)
- EXPLAIN visualization
- Dark/light themes + customization
- Database diff + migration generation
- Command palette (Cmd+K)
- SSH tunnel support

### Won't Have (this version)
- Built-in AI model (always BYOK)
- Cloud-hosted SaaS version (desktop only)
- NoSQL visual query builder (MongoDB uses MQL directly)
- Real-time collaboration (Google Docs-style)

---

## Competitive Position

| | DBeaver | DataGrip | TablePlus | Chat2DB | **MAI SQL** |
|---|---------|----------|-----------|---------|-------------|
| Price | Free/Pro | $229/yr | $89 | Free | **Free (MIT)** |
| AI | Plugin | JetBrains AI | Basic | Ollama/API | **5 providers, BYOK** |
| AI Lock-in | Yes | JetBrains | Partial | Partial | **None** |
| Multi-DB | 100+ | 100+ | 20+ | 14+ | **6 (focused)** |
| Desktop | Java 300MB+ | Java 500MB+ | Native 30MB | Electron 150MB+ | **Electron** |
| Open Source | Community Ed | No | No | Yes | **Yes (MIT)** |
| Context Index | No | Partial | No | No | **Yes** |

**Positioning:** MAI SQL sits between Chat2DB (AI-first but heavy) and TablePlus (lightweight but limited AI). It delivers deep AI with BYOK flexibility in a modern package.
