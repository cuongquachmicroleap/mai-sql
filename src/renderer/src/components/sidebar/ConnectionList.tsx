import { useEffect } from 'react'
import { Plug, PlugZap, Trash2 } from 'lucide-react'
import { useConnectionStore } from '../../stores/connection-store'
import { cn } from '../../lib/utils'

export function ConnectionList() {
  const { connections, activeConnectionId, loading, loadConnections, connectTo, disconnectFrom, deleteConnection } =
    useConnectionStore()

  useEffect(() => { loadConnections() }, [])

  if (loading) {
    return <div className="px-3 py-2 text-xs text-muted-foreground animate-pulse">Loading...</div>
  }

  if (connections.length === 0) {
    return (
      <div className="px-3 py-4 text-center text-xs text-muted-foreground">
        No connections yet.<br />Add one to get started.
      </div>
    )
  }

  return (
    <div className="space-y-0.5 p-1">
      {connections.map((conn) => {
        const isActive = conn.id === activeConnectionId
        return (
          <div
            key={conn.id}
            className={cn(
              'group flex items-center gap-2 rounded px-2 py-1.5 text-sm',
              isActive ? 'bg-primary/10 text-primary' : 'hover:bg-muted'
            )}
          >
            <button
              onClick={() => isActive ? disconnectFrom(conn.id) : connectTo(conn.id)}
              className="flex flex-1 items-center gap-2 min-w-0"
            >
              {isActive
                ? <PlugZap className="h-4 w-4 shrink-0 text-primary" />
                : <Plug className="h-4 w-4 shrink-0 text-muted-foreground" />}
              <span className="truncate">{conn.name}</span>
            </button>
            <button
              onClick={() => deleteConnection(conn.id)}
              className="hidden group-hover:flex h-5 w-5 items-center justify-center rounded hover:bg-destructive/20 hover:text-destructive"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
        )
      })}
    </div>
  )
}
