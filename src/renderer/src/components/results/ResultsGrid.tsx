import { useRef } from 'react'
import { useReactTable, getCoreRowModel, flexRender, type ColumnDef } from '@tanstack/react-table'
import { useVirtualizer } from '@tanstack/react-virtual'
import type { QueryResult } from '@shared/types/query'

interface ResultsGridProps {
  result: QueryResult
}

function CellValue({ value }: { value: unknown }) {
  if (value === null || value === undefined) {
    return (
      <span style={{ color: 'var(--color-null)', fontStyle: 'italic', fontSize: 12 }}>
        NULL
      </span>
    )
  }
  if (typeof value === 'boolean') {
    return (
      <span className="flex items-center gap-1">
        <span
          className="h-1.5 w-1.5 rounded-full shrink-0"
          style={{ background: value ? '#22C55E' : '#EF4444' }}
        />
        <span style={{ color: value ? '#22C55E' : '#EF4444' }}>{value ? 'true' : 'false'}</span>
      </span>
    )
  }
  if (value instanceof Date) return <>{value.toISOString()}</>
  return <>{String(value)}</>
}

function isNumericValue(val: unknown): boolean {
  return typeof val === 'number' || (typeof val === 'string' && val !== '' && !isNaN(Number(val)))
}

export function ResultsGrid({ result }: ResultsGridProps) {
  const parentRef = useRef<HTMLDivElement>(null)

  const columns: ColumnDef<Record<string, unknown>>[] = result.columns.map((col) => ({
    id: col.name,
    accessorKey: col.name,
    header: () => (
      <div className="flex flex-col leading-tight">
        <span style={{ fontWeight: 600, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          {col.name}
        </span>
        <span style={{ fontSize: 10, fontWeight: 400, color: 'var(--color-text-muted)' }}>
          {col.dataType}
        </span>
      </div>
    ),
    cell: ({ getValue }) => {
      const val = getValue()
      return <CellValue value={val} />
    },
    size: 160,
    minSize: 60,
    maxSize: 400,
  }))

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
    overscan: 10,
  })

  const virtualRows = rowVirtualizer.getVirtualItems()
  const totalSize = rowVirtualizer.getTotalSize()
  const paddingTop = virtualRows.length > 0 ? virtualRows[0].start : 0
  const paddingBottom = virtualRows.length > 0 ? totalSize - virtualRows[virtualRows.length - 1].end : 0

  return (
    <div
      ref={parentRef}
      className="h-full overflow-auto"
      style={{ background: 'var(--color-bg-elevated)', fontFamily: 'var(--font-mono)', fontSize: 13 }}
    >
      <table className="w-full border-collapse" style={{ lineHeight: 1.0 }}>
        <thead className="sticky top-0 z-10" style={{ background: 'var(--color-bg-overlay)' }}>
          {table.getHeaderGroups().map((hg) => (
            <tr key={hg.id}>
              {hg.headers.map((header) => (
                <th
                  key={header.id}
                  style={{
                    width: header.getSize(),
                    height: 32,
                    borderBottom: '1px solid var(--color-border)',
                    borderRight: '1px solid var(--color-border)',
                    padding: '0 8px',
                    textAlign: 'left',
                    fontFamily: 'var(--font-sans)',
                    color: 'var(--color-text-secondary)',
                    verticalAlign: 'middle',
                  }}
                >
                  {flexRender(header.column.columnDef.header, header.getContext())}
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
            return (
              <tr
                key={row.id}
                style={{
                  background: isOdd ? 'rgba(255,255,255,0.02)' : 'transparent',
                  borderBottom: '1px solid rgba(255,255,255,0.04)',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)' }}
                onMouseLeave={(e) => { e.currentTarget.style.background = isOdd ? 'rgba(255,255,255,0.02)' : 'transparent' }}
              >
                {row.getVisibleCells().map((cell) => {
                  const val = cell.getValue()
                  const isNum = isNumericValue(val)
                  return (
                    <td
                      key={cell.id}
                      style={{
                        width: cell.column.getSize(),
                        height: 28,
                        borderRight: '1px solid rgba(255,255,255,0.04)',
                        padding: '0 8px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        textAlign: isNum ? 'right' : 'left',
                        color: 'var(--color-text-primary)',
                        verticalAlign: 'middle',
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
