import Editor, { type Monaco } from '@monaco-editor/react'
import { useEditorStore } from '../../stores/editor-store'

interface QueryEditorProps {
  tabId: string
}

export function QueryEditor({ tabId }: QueryEditorProps) {
  const { tabs, updateTabContent } = useEditorStore()
  const tab = tabs.find((t) => t.id === tabId)
  if (!tab) return null

  const handleMount = (_editor: unknown, monaco: Monaco) => {
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
          quickSuggestions: true,
          padding: { top: 12, bottom: 12 },
          lineHeight: 22,
          renderLineHighlight: 'all',
          smoothScrolling: true,
        }}
      />
    </div>
  )
}
