import { useRef, useEffect } from 'react'
import Editor, { type Monaco } from '@monaco-editor/react'
import type * as MonacoTypes from 'monaco-editor'
import { useEditorStore } from '../../stores/editor-store'
import { useConnectionStore } from '../../stores/connection-store'
import { invoke } from '../../lib/ipc-client'
import type { TableInfo, ColumnInfo, FunctionInfo, IndexInfo, TriggerInfo } from '@shared/types/schema'

interface QueryEditorProps {
  tabId: string
}

interface SchemaCache {
  tables: TableInfo[]
  columnsByTable: Record<string, ColumnInfo[]>
  indexesByTable: Record<string, IndexInfo[]>
  triggersByTable: Record<string, TriggerInfo[]>
  functions: FunctionInfo[]
}

// SQL keywords for fallback suggestions
const SQL_KEYWORDS = [
  'SELECT', 'FROM', 'WHERE', 'JOIN', 'LEFT JOIN', 'RIGHT JOIN', 'INNER JOIN',
  'OUTER JOIN', 'FULL JOIN', 'CROSS JOIN', 'ON', 'AND', 'OR', 'NOT', 'IN',
  'EXISTS', 'BETWEEN', 'LIKE', 'IS NULL', 'IS NOT NULL', 'ORDER BY', 'GROUP BY',
  'HAVING', 'LIMIT', 'OFFSET', 'DISTINCT', 'AS', 'INSERT INTO', 'VALUES',
  'UPDATE', 'SET', 'DELETE FROM', 'CREATE TABLE', 'DROP TABLE', 'ALTER TABLE',
  'ADD COLUMN', 'DROP COLUMN', 'CREATE INDEX', 'DROP INDEX', 'TRUNCATE',
  'BEGIN', 'COMMIT', 'ROLLBACK', 'WITH', 'UNION', 'UNION ALL', 'EXCEPT',
  'INTERSECT', 'CASE', 'WHEN', 'THEN', 'ELSE', 'END', 'CAST', 'COALESCE',
  'NULLIF', 'COUNT', 'SUM', 'AVG', 'MIN', 'MAX', 'NOW', 'CURRENT_TIMESTAMP',
]

export function QueryEditor({ tabId }: QueryEditorProps) {
  const { tabs, updateTabContent, setSelectedText } = useEditorStore()
  const { activeConnectionId } = useConnectionStore()
  const tab = tabs.find((t) => t.id === tabId)
  const editorRef = useRef<MonacoTypes.editor.IStandaloneCodeEditor | null>(null)
  const monacoRef = useRef<Monaco | null>(null)
  const schemaCacheRef = useRef<SchemaCache | null>(null)
  const completionDisposableRef = useRef<MonacoTypes.IDisposable | null>(null)
  const connectionIdRef = useRef<string | null>(null)

  // Use activeConnectionId so schema is available as soon as a connection is active,
  // without waiting for the first query execution to set tab.connectionId
  const connectionId = activeConnectionId
  connectionIdRef.current = connectionId

  // Fetch tables and functions for the current connection, populate cache
  const fetchSchema = async (connId: string) => {
    try {
      // Discover actual schemas (mirrors DatabaseTree behaviour — never hardcode 'public')
      const dbs = await invoke('schema:databases', connId)
      let schemaList: string[] = []
      if (dbs.length > 0) {
        schemaList = await invoke('schema:schemas', connId, dbs[0])
        if (schemaList.length === 0) schemaList = ['public']
      } else {
        schemaList = ['public']
      }

      const primarySchema = schemaList[0]
      const [tablesPerSchema, functions] = await Promise.all([
        Promise.all(schemaList.map((s) => invoke('schema:tables', connId, s))),
        invoke('schema:functions', connId, primarySchema),
      ])
      const tables = tablesPerSchema.flat()
      schemaCacheRef.current = { tables, columnsByTable: {}, indexesByTable: {}, triggersByTable: {}, functions }
    } catch {
      schemaCacheRef.current = { tables: [], columnsByTable: {}, indexesByTable: {}, triggersByTable: {}, functions: [] }
    }
  }

  // Lazily fetch columns for a specific table, caching the result
  const fetchColumns = async (connId: string, tableName: string): Promise<ColumnInfo[]> => {
    const cache = schemaCacheRef.current
    if (!cache) return []
    if (cache.columnsByTable[tableName]) return cache.columnsByTable[tableName]
    try {
      // Use the table's own schema from the cache (avoids hardcoding 'public')
      const tableInfo = cache.tables.find((t) => t.name === tableName)
      const tableSchema = tableInfo?.schema ?? 'public'
      const columns = await invoke('schema:columns', connId, tableName, tableSchema)
      cache.columnsByTable[tableName] = columns
      return columns
    } catch {
      cache.columnsByTable[tableName] = []
      return []
    }
  }

  // Lazily fetch indexes for a specific table, caching the result
  const fetchIndexes = async (connId: string, tableName: string): Promise<IndexInfo[]> => {
    const cache = schemaCacheRef.current
    if (!cache) return []
    if (cache.indexesByTable[tableName]) return cache.indexesByTable[tableName]
    try {
      const tableInfo = cache.tables.find((t) => t.name === tableName)
      const indexes = await invoke('schema:indexes', connId, tableName, tableInfo?.schema ?? 'public')
      cache.indexesByTable[tableName] = indexes
      return indexes
    } catch {
      cache.indexesByTable[tableName] = []
      return []
    }
  }

  // Lazily fetch triggers for a specific table, caching the result
  const fetchTriggers = async (connId: string, tableName: string): Promise<TriggerInfo[]> => {
    const cache = schemaCacheRef.current
    if (!cache) return []
    if (cache.triggersByTable[tableName]) return cache.triggersByTable[tableName]
    try {
      const tableInfo = cache.tables.find((t) => t.name === tableName)
      const triggers = await invoke('schema:triggers', connId, tableName, tableInfo?.schema ?? 'public')
      cache.triggersByTable[tableName] = triggers
      return triggers
    } catch {
      cache.triggersByTable[tableName] = []
      return []
    }
  }

  // Register the completion provider — called once Monaco is ready and whenever connectionId changes
  const registerCompletionProvider = (monaco: Monaco) => {
    // Dispose the old provider before registering a new one
    if (completionDisposableRef.current) {
      completionDisposableRef.current.dispose()
      completionDisposableRef.current = null
    }

    const disposable = monaco.languages.registerCompletionItemProvider('sql', {
      triggerCharacters: [' ', '.', '\n'],

      provideCompletionItems: async (
        model: MonacoTypes.editor.ITextModel,
        position: MonacoTypes.Position
      ) => {
        const connId = connectionIdRef.current
        const cache = schemaCacheRef.current

        const wordInfo = model.getWordUntilPosition(position)
        const range = {
          startLineNumber: position.lineNumber,
          endLineNumber: position.lineNumber,
          startColumn: wordInfo.startColumn,
          endColumn: position.column,
        }

        // Text on the current line up to (but not including) the current word
        const lineTextBefore = model.getValueInRange({
          startLineNumber: position.lineNumber,
          startColumn: 1,
          endLineNumber: position.lineNumber,
          endColumn: wordInfo.startColumn,
        })

        // --- Alias resolution ---
        // Parse "FROM table alias" and "JOIN table alias" patterns from the full query
        const fullText = model.getValue()
        const aliasMap = new Map<string, string>() // alias -> tableName
        const aliasRegex = /\b(?:FROM|JOIN)\s+(\w+)\s+(?:AS\s+)?(\w+)/gi
        let aliasMatch
        while ((aliasMatch = aliasRegex.exec(fullText)) !== null) {
          aliasMap.set(aliasMatch[2].toLowerCase(), aliasMatch[1])
        }

        // --- Context detection ---

        // 1. Column mode: "tablename." or "alias." - suggest columns for that table
        const dotMatch = lineTextBefore.match(/(\w+)\.$/)
        if (dotMatch) {
          // Resolve alias to table name if possible
          const rawName = dotMatch[1]
          const tableName = aliasMap.get(rawName.toLowerCase()) ?? rawName
          const columnRange = {
            startLineNumber: position.lineNumber,
            endLineNumber: position.lineNumber,
            startColumn: position.column,
            endColumn: position.column,
          }
          if (connId && cache) {
            const [columns, indexes, triggers] = await Promise.all([
              fetchColumns(connId, tableName),
              fetchIndexes(connId, tableName),
              fetchTriggers(connId, tableName),
            ])
            return {
              suggestions: [
                ...columns.map((col) => ({
                  label: col.name,
                  kind: monaco.languages.CompletionItemKind.Field,
                  detail: `${col.displayType}${col.nullable ? '' : ' NOT NULL'}${col.isPrimaryKey ? ' PK' : ''}`,
                  documentation: col.comment,
                  insertText: col.name,
                  range: columnRange,
                })),
                ...indexes.map((idx) => ({
                  label: idx.name,
                  kind: monaco.languages.CompletionItemKind.Reference,
                  detail: `index on ${tableName} (${idx.columns.join(', ')})${idx.isUnique ? ' UNIQUE' : ''}`,
                  insertText: idx.name,
                  range: columnRange,
                })),
                ...triggers.map((trg) => ({
                  label: trg.name,
                  kind: monaco.languages.CompletionItemKind.Event,
                  detail: `${trg.timing} ${trg.event} ON ${tableName}`,
                  insertText: trg.name,
                  range: columnRange,
                })),
              ],
            }
          }
          return { suggestions: [] }
        }

        // 2. Table mode: after FROM / JOIN / INTO / UPDATE keywords → suggest table names
        const tableKeywordMatch = /\b(FROM|JOIN|INTO|UPDATE)\s+\w*$/i.test(lineTextBefore)
        if (tableKeywordMatch && cache) {
          return {
            suggestions: cache.tables.map((tbl) => ({
              label: tbl.name,
              kind: monaco.languages.CompletionItemKind.Class,
              detail: `${tbl.type} — ${tbl.schema}`,
              documentation: tbl.comment,
              insertText: tbl.name,
              range,
            })),
          }
        }

        // 2b. JOIN ON mode: after "JOIN table ON" suggest FK-based conditions
        const joinOnMatch = fullText.match(/\bJOIN\s+(\w+)\s+(?:AS\s+)?(\w+)?\s+ON\s*$/i)
        if (joinOnMatch && connId && cache) {
          const joinTable = joinOnMatch[1]
          const joinAlias = joinOnMatch[2] || joinTable
          // Find FK relationships involving this table
          try {
            const joinTableInfo = cache.tables.find((t) => t.name === joinTable)
            const rels = await invoke('schema:relationships', connId, joinTableInfo?.schema ?? 'public')
            const suggestions = rels
              .filter((r) => r.sourceTable === joinTable || r.targetTable === joinTable)
              .map((r) => {
                const isSource = r.sourceTable === joinTable
                const otherTable = isSource ? r.targetTable : r.sourceTable
                const otherAlias = Array.from(aliasMap.entries()).find(([, t]) => t === otherTable)?.[0] || otherTable
                const joinCol = isSource ? r.sourceColumn : r.targetColumn
                const otherCol = isSource ? r.targetColumn : r.sourceColumn
                const text = `${joinAlias}.${joinCol} = ${otherAlias}.${otherCol}`
                return {
                  label: text,
                  kind: monaco.languages.CompletionItemKind.Snippet,
                  detail: `FK: ${r.constraintName}`,
                  insertText: text,
                  range,
                }
              })
            if (suggestions.length > 0) return { suggestions }
          } catch { /* ignore */ }
        }

        // 3. Index mode: after DROP INDEX / REINDEX - suggest all indexes (flat list)
        const indexKeywordMatch = /\b(DROP INDEX|REINDEX)\s+\w*$/i.test(lineTextBefore)
        if (indexKeywordMatch && connId && cache) {
          const allIndexResults = await Promise.all(
            cache.tables.map((tbl) => fetchIndexes(connId, tbl.name).then((idxs) => ({ tableName: tbl.name, idxs })))
          )
          const indexSuggestions: MonacoTypes.languages.CompletionItem[] = []
          for (const { tableName, idxs } of allIndexResults) {
            for (const idx of idxs) {
              indexSuggestions.push({
                label: idx.name,
                kind: monaco.languages.CompletionItemKind.Reference,
                detail: `index on ${tableName} (${idx.columns.join(', ')})${idx.isUnique ? ' UNIQUE' : ''}`,
                insertText: idx.name,
                range,
              })
            }
          }
          return { suggestions: indexSuggestions }
        }

        // 4. Trigger mode: after DROP/ENABLE/DISABLE TRIGGER → suggest all triggers (flat list)
        const triggerKeywordMatch = /\b(DROP TRIGGER|ENABLE TRIGGER|DISABLE TRIGGER|TRIGGER)\s+\w*$/i.test(lineTextBefore)
        if (triggerKeywordMatch && connId && cache) {
          const allTriggerResults = await Promise.all(
            cache.tables.map((tbl) => fetchTriggers(connId, tbl.name).then((trgs) => ({ tableName: tbl.name, trgs })))
          )
          const triggerSuggestions: MonacoTypes.languages.CompletionItem[] = []
          for (const { tableName, trgs } of allTriggerResults) {
            for (const trg of trgs) {
              triggerSuggestions.push({
                label: trg.name,
                kind: monaco.languages.CompletionItemKind.Event,
                detail: `${trg.timing} ${trg.event} ON ${tableName}`,
                insertText: trg.name,
                range,
              })
            }
          }
          return { suggestions: triggerSuggestions }
        }

        // 5. Default mode: SQL keywords + table names + functions
        const suggestions: MonacoTypes.languages.CompletionItem[] = [
          ...SQL_KEYWORDS.map((kw) => ({
            label: kw,
            kind: monaco.languages.CompletionItemKind.Keyword,
            insertText: kw,
            range,
          })),
        ]

        if (cache) {
          suggestions.push(
            ...cache.tables.map((tbl) => ({
              label: tbl.name,
              kind: monaco.languages.CompletionItemKind.Class,
              detail: `${tbl.type} — ${tbl.schema}`,
              documentation: tbl.comment,
              insertText: tbl.name,
              range,
            })),
            ...cache.functions.map((fn) => ({
              label: fn.name,
              kind: monaco.languages.CompletionItemKind.Function,
              detail: `${fn.kind}() → ${fn.returnType}`,
              insertText: `${fn.name}(`,
              range,
            }))
          )
        }

        return { suggestions }
      },
    })

    completionDisposableRef.current = disposable
  }

  // Re-register the provider and refresh schema cache when connectionId changes
  useEffect(() => {
    const monaco = monacoRef.current
    if (!monaco) return

    // Clear stale cache for the previous connection
    schemaCacheRef.current = null

    if (connectionId) {
      fetchSchema(connectionId)
    }

    registerCompletionProvider(monaco)

    return () => {
      if (completionDisposableRef.current) {
        completionDisposableRef.current.dispose()
        completionDisposableRef.current = null
      }
    }
  }, [connectionId])

  if (!tab) return null

  const handleMount = (editor: MonacoTypes.editor.IStandaloneCodeEditor, monaco: Monaco) => {
    editorRef.current = editor
    monacoRef.current = monaco

    monaco.editor.defineTheme('mai-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'keyword', foreground: '5B8AF0', fontStyle: 'bold' },
        { token: 'string', foreground: 'CE9178' },
        { token: 'number', foreground: '98C379' },
        { token: 'comment', foreground: '555560', fontStyle: 'italic' },
      ],
      colors: {
        'editor.background': '#131316',
        'editor.foreground': '#ECECEC',
        'editor.lineHighlightBackground': '#1C1C20',
        'editorLineNumber.foreground': '#3A3A45',
        'editorLineNumber.activeForeground': '#5B8AF0',
        'editor.selectionBackground': '#5B8AF025',
        'editorCursor.foreground': '#5B8AF0',
        'editorIndentGuide.background1': '#222227',
        'editorGutter.background': '#131316',
      },
    })
    monaco.editor.setTheme('mai-dark')

    // Disable Monaco's built-in SQL word-based completions so our
    // schema-aware provider is the sole source of suggestions
    monaco.languages.setLanguageConfiguration('sql', {
      wordPattern: /(-?\d*\.\d\w*)|([^`~!@#%^&*()\-=+[{\]}\\|;:'",.<>/?\s]+)/,
    })

    // Track selection changes
    editor.onDidChangeCursorSelection(() => {
      const selection = editor.getSelection()
      if (selection && !selection.isEmpty()) {
        const model = editor.getModel()
        const selectedText = model?.getValueInRange(selection) ?? ''
        setSelectedText(tabId, selectedText)
      } else {
        setSelectedText(tabId, '')
      }
    })

    // Register the initial completion provider (connectionId may already be set)
    schemaCacheRef.current = null
    if (connectionId) {
      fetchSchema(connectionId)
    }
    registerCompletionProvider(monaco)
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
          fontFamily: "'JetBrains Mono', 'SF Mono', 'Fira Code', monospace",
          minimap: { enabled: false },
          lineNumbers: 'on',
          scrollBeyondLastLine: false,
          wordWrap: 'on',
          automaticLayout: true,
          tabSize: 2,
          quickSuggestions: { other: true, comments: false, strings: false },
          suggestOnTriggerCharacters: true,
          acceptSuggestionOnEnter: 'on',
          wordBasedSuggestions: 'off',
          padding: { top: 12, bottom: 12 },
          lineHeight: 22,
          renderLineHighlight: 'all',
          smoothScrolling: true,
        }}
      />
    </div>
  )
}
