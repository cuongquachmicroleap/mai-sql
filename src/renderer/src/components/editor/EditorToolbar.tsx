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
