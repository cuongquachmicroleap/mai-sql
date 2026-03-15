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
