import { useRef } from 'react'
import { useReactTable, getCoreRowModel, flexRender, type ColumnDef } from '@tanstack/react-table'
import { useVirtualizer } from '@tanstack/react-virtual'
import type { QueryResult } from '@shared/types/query'

interface ResultsGridProps {
  result: QueryResult
}

function CellValue({ value }: { value: unknown }) {
  if (value === null || value === undefined) {
    return <span style={{ color: 'var(--color-null)', fontStyle: 'italic', opacity: 0.7 }}>NULL</span>
  }
  if (typeof value === 'boolean') {
    return (
      <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: value ? '#22C55E' : '#EF4444', flexShrink: 0 }} />
        <span style={{ color: value ? '#22C55E' : '#EF4444' }}>{value ? 'true' : 'false'}</span>
      </span>
    )
  }
  if (value instanceof Date) return <>{value.toISOString()}</>
  return <>{String(value)}</>
}

function isNumeric(val: unknown): boolean {
  return typeof val === 'number' || (typeof val === 'string' && val !== '' && !isNaN(Number(val)))
}

// Estimate column width from data
function estimateColWidth(name: string, rows: Record<string, unknown>[], maxRows = 50): number {
  const headerLen = name.length
  let maxDataLen = 0
  for (let i = 0; i < Math.min(rows.length, maxRows); i++) {
    const v = rows[i][name]
    if (v !== null && v !== undefined) {
      maxDataLen = Math.max(maxDataLen, String(v).length)
    }
  }
  const charWidth = 8 // approx px per char in monospace 13px
  const padding = 24
  return Math.min(400, Math.max(80, Math.max(headerLen, maxDataLen) * charWidth + padding))
}

export function ResultsGrid({ result }: ResultsGridProps) {
  const parentRef = useRef<HTMLDivElement>(null)

  const columns: ColumnDef<Record<string, unknown>>[] = [
    // Row number column
    {
      id: '__rownum__',
      header: () => <span style={{ color: 'var(--color-text-muted)' }}>#</span>,
      cell: ({ row }) => (
        <span style={{ color: 'var(--color-text-muted)', fontVariantNumeric: 'tabular-nums' }}>
          {row.index + 1}
        </span>
      ),
      size: 52,
      enableResizing: false,
    },
    ...result.columns.map((col) => ({
      id: col.name,
      accessorKey: col.name,
      header: () => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <span style={{ fontWeight: 600, fontSize: 12, textTransform: 'uppercase' as const, letterSpacing: '0.05em', color: 'var(--color-text-secondary)' }}>
            {col.name}
          </span>
          <span style={{ fontSize: 10, color: 'var(--color-text-muted)', fontFamily: 'var(--font-sans)', textTransform: 'none' as const, letterSpacing: 0 }}>
            {col.dataType}
          </span>
        </div>
      ),
      cell: ({ getValue }: { getValue: () => unknown }) => <CellValue value={getValue()} />,
      size: estimateColWidth(col.name, result.rows),
    })),
  ]

  const table = useReactTable({
    data: result.rows,
    columns,
    getCoreRowModel: getCoreRowModel(),
    columnResizeMode: 'onChange',
  })

  const { rows } = table.getRowModel()

  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 28,
    overscan: 15,
  })

  const virtualRows = rowVirtualizer.getVirtualItems()
  const totalSize = rowVirtualizer.getTotalSize()
  const paddingTop = virtualRows.length > 0 ? virtualRows[0].start : 0
  const paddingBottom = virtualRows.length > 0 ? totalSize - virtualRows[virtualRows.length - 1].end : 0

  const ROW_NUM_STYLE: React.CSSProperties = {
    background: 'var(--color-bg-overlay)',
    borderRight: '1px solid var(--color-border)',
    position: 'sticky',
    left: 0,
    zIndex: 1,
  }

  return (
    <div
      ref={parentRef}
      className="h-full overflow-auto"
      style={{ background: 'var(--color-bg-elevated)', fontFamily: 'var(--font-mono)', fontSize: 13 }}
    >
      <table style={{ width: '100%', borderCollapse: 'collapse', lineHeight: '1.0' }}>
        <thead style={{ position: 'sticky', top: 0, zIndex: 10, background: 'var(--color-bg-overlay)' }}>
          {table.getHeaderGroups().map((hg) => (
            <tr key={hg.id}>
              {hg.headers.map((header, i) => (
                <th
                  key={header.id}
                  style={{
                    width: header.getSize(),
                    height: 34,
                    borderBottom: '2px solid var(--color-border)',
                    borderRight: '1px solid var(--color-border)',
                    padding: '0 10px',
                    textAlign: 'left',
                    fontFamily: 'var(--font-sans)',
                    verticalAlign: 'middle',
                    whiteSpace: 'nowrap',
                    ...(i === 0 ? ROW_NUM_STYLE : {}),
                    position: i === 0 ? 'sticky' : 'relative',
                    left: i === 0 ? 0 : 'auto',
                    zIndex: i === 0 ? 11 : 'auto',
                  }}
                >
                  {flexRender(header.column.columnDef.header, header.getContext())}
                  {/* Resize handle */}
                  {header.column.getCanResize() && (
                    <div
                      onMouseDown={header.getResizeHandler()}
                      style={{
                        position: 'absolute', right: 0, top: 0, bottom: 0,
                        width: 4, cursor: 'col-resize', userSelect: 'none',
                        background: header.column.getIsResizing() ? 'var(--color-primary)' : 'transparent',
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'var(--color-primary)'}
                      onMouseLeave={(e) => {
                        if (!header.column.getIsResizing()) e.currentTarget.style.background = 'transparent'
                      }}
                    />
                  )}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {paddingTop > 0 && <tr><td style={{ height: paddingTop }} /></tr>}
          {virtualRows.map((vRow) => {
            const row = rows[vRow.index]
            const isOdd = vRow.index % 2 === 1
            const rowBg = isOdd ? 'rgba(255,255,255,0.018)' : 'transparent'
            return (
              <tr
                key={row.id}
                style={{ background: rowBg }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(59,130,246,0.08)' }}
                onMouseLeave={(e) => { e.currentTarget.style.background = rowBg }}
              >
                {row.getVisibleCells().map((cell, i) => {
                  const val = cell.getValue()
                  const isNum = i > 0 && isNumeric(val)
                  return (
                    <td
                      key={cell.id}
                      style={{
                        width: cell.column.getSize(),
                        height: 28,
                        borderBottom: '1px solid rgba(255,255,255,0.04)',
                        borderRight: '1px solid rgba(255,255,255,0.04)',
                        padding: '0 10px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        textAlign: isNum ? 'right' : 'left',
                        color: 'var(--color-text-primary)',
                        verticalAlign: 'middle',
                        ...(i === 0 ? {
                          ...ROW_NUM_STYLE,
                          textAlign: 'right',
                          padding: '0 8px',
                          fontSize: 11,
                        } : {}),
                      }}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  )
                })}
              </tr>
            )
          })}
          {paddingBottom > 0 && <tr><td style={{ height: paddingBottom }} /></tr>}
        </tbody>
      </table>
    </div>
  )
}
