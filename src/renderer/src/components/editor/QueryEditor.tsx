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
