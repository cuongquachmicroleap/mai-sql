import { useMemo, useState } from 'react'
import { Copy, Check } from 'lucide-react'
import type { TableDesignerState } from '@shared/types/schema'
import { generateCreateTableSQL, generateAlterTableSQL } from '../../lib/ddl-generator'

interface SQLPreviewProps {
  state: TableDesignerState
  originalState?: TableDesignerState
  mode: 'create' | 'alter'
}

export function SQLPreview({ state, originalState, mode }: SQLPreviewProps) {
  const [copied, setCopied] = useState(false)

  const sql = useMemo(() => {
    if (mode === 'alter' && originalState) {
      return generateAlterTableSQL(originalState, state)
    }
    return generateCreateTableSQL(state)
  }, [state, originalState, mode])

  const handleCopy = () => {
    navigator.clipboard.writeText(sql).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Toolbar */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '6px 10px',
        borderBottom: '1px solid var(--mai-border)',
        background: 'var(--mai-bg-panel)',
      }}>
        <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--mai-text-3)' }}>
          {mode === 'alter' ? 'ALTER TABLE Preview' : 'CREATE TABLE Preview'}
        </span>
        <button
          onClick={handleCopy}
          style={{
            display: 'flex', alignItems: 'center', gap: 4,
            background: 'none', border: '1px solid var(--mai-border-strong)',
            borderRadius: 4, padding: '3px 8px',
            color: copied ? '#34D399' : 'var(--mai-text-2)', fontSize: 10, cursor: 'pointer',
          }}
        >
          {copied ? <Check size={10} /> : <Copy size={10} />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>

      {/* SQL content */}
      <div style={{ flex: 1, overflow: 'auto', padding: 12 }}>
        <pre style={{
          margin: 0,
          fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace',
          fontSize: 12,
          lineHeight: 1.6,
          color: 'var(--mai-text-1)',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
        }}>
          {sql}
        </pre>
      </div>
    </div>
  )
}
