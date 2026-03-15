import { useRef } from 'react'
import { useReactTable, getCoreRowModel, flexRender, type ColumnDef } from '@tanstack/react-table'
import { useVirtualizer } from '@tanstack/react-virtual'
import type { QueryResult } from '@shared/types/query'

interface ResultsGridProps {
  result: QueryResult
}

export function ResultsGrid({ result }: ResultsGridProps) {
  const parentRef = useRef<HTMLDivElement>(null)

  const columns: ColumnDef<Record<string, unknown>>[] = result.columns.map((col) => ({
    id: col.name,
    accessorKey: col.name,
    header: () => (
      <div className="flex flex-col leading-tight">
        <span className="font-medium">{col.name}</span>
        <span className="text-[10px] font-normal text-muted-foreground">{col.dataType}</span>
      </div>
    ),
    cell: ({ getValue }) => {
      const val = getValue()
      if (val === null || val === undefined) return <span className="text-muted-foreground italic text-xs">NULL</span>
      if (val instanceof Date) return val.toISOString()
      return String(val)
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
    estimateSize: () => 36,
    overscan: 10,
  })

  const virtualRows = rowVirtualizer.getVirtualItems()
  const totalSize = rowVirtualizer.getTotalSize()
  const paddingTop = virtualRows.length > 0 ? virtualRows[0].start : 0
  const paddingBottom = virtualRows.length > 0 ? totalSize - virtualRows[virtualRows.length - 1].end : 0

  return (
    <div ref={parentRef} className="h-full overflow-auto text-sm">
      <table className="w-full border-collapse">
        <thead className="sticky top-0 z-10 bg-muted/80 backdrop-blur-sm">
          {table.getHeaderGroups().map((hg) => (
            <tr key={hg.id}>
              {hg.headers.map((header) => (
                <th
                  key={header.id}
                  style={{ width: header.getSize() }}
                  className="border-b border-r border-border px-2 py-1.5 text-left font-medium relative"
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
            return (
              <tr key={row.id} className="hover:bg-muted/50 border-b border-border/50">
                {row.getVisibleCells().map((cell) => (
                  <td
                    key={cell.id}
                    style={{ width: cell.column.getSize() }}
                    className="truncate border-r border-border/30 px-2 py-1.5"
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            )
          })}
          {paddingBottom > 0 && <tr><td style={{ height: paddingBottom }} /></tr>}
        </tbody>
      </table>
    </div>
  )
}
