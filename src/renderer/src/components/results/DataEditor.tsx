import { useState, useRef, useEffect } from 'react'

interface DataEditorProps {
  value: unknown
  columnName: string
  rowIndex: number
  onSave: (rowIndex: number, columnName: string, newValue: string) => void
  onCancel: () => void
}

export function DataEditor({ value, columnName, rowIndex, onSave, onCancel }: DataEditorProps) {
  const [editValue, setEditValue] = useState(value === null || value === undefined ? '' : String(value))
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
    inputRef.current?.select()
  }, [])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      onSave(rowIndex, columnName, editValue)
    } else if (e.key === 'Escape') {
      e.preventDefault()
      onCancel()
    } else if (e.key === 'Tab') {
      e.preventDefault()
      onSave(rowIndex, columnName, editValue)
    }
  }

  return (
    <input
      ref={inputRef}
      type="text"
      value={editValue}
      onChange={(e) => setEditValue(e.target.value)}
      onKeyDown={handleKeyDown}
      onBlur={() => onSave(rowIndex, columnName, editValue)}
      style={{
        width: '100%',
        height: '100%',
        background: 'var(--mai-bg-elevated)',
        border: '2px solid var(--mai-accent)',
        borderRadius: 2,
        color: 'var(--mai-text-1)',
        fontSize: 13,
        fontFamily: "ui-monospace, 'SF Mono', 'Cascadia Code', monospace",
        padding: '0 8px',
        outline: 'none',
        boxSizing: 'border-box',
      }}
    />
  )
}
