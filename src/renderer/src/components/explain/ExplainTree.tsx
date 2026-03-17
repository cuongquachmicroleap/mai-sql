import { useState } from 'react'
import { ChevronRight, ChevronDown, Zap, Clock, Rows3 } from 'lucide-react'

interface PlanNode {
  'Node Type': string
  'Relation Name'?: string
  'Alias'?: string
  'Startup Cost'?: number
  'Total Cost'?: number
  'Plan Rows'?: number
  'Plan Width'?: number
  'Actual Startup Time'?: number
  'Actual Total Time'?: number
  'Actual Rows'?: number
  'Actual Loops'?: number
  'Filter'?: string
  'Join Filter'?: string
  'Index Cond'?: string
  'Index Name'?: string
  'Hash Cond'?: string
  'Merge Cond'?: string
  'Sort Key'?: string[]
  Plans?: PlanNode[]
  [key: string]: unknown
}

interface ExplainTreeProps {
  explainResult: string
}

function parseExplainJSON(text: string): PlanNode | null {
  try {
    const parsed = JSON.parse(text)
    // EXPLAIN (FORMAT JSON) returns array with single object containing Plan
    if (Array.isArray(parsed) && parsed[0]?.Plan) {
      return parsed[0].Plan
    }
    // Direct plan object
    if (parsed?.Plan) return parsed.Plan
    if (parsed?.['Node Type']) return parsed
    return null
  } catch {
    return null
  }
}

function costColor(cost: number): string {
  if (cost < 10) return '#34D399'    // green
  if (cost < 100) return '#FBBF24'   // yellow
  if (cost < 1000) return '#F97316'  // orange
  return '#F87171'                     // red
}

function timeColor(ms: number): string {
  if (ms < 1) return '#34D399'
  if (ms < 10) return '#FBBF24'
  if (ms < 100) return '#F97316'
  return '#F87171'
}

function PlanNodeRow({ node, depth = 0 }: { node: PlanNode; depth?: number }) {
  const [expanded, setExpanded] = useState(true)
  const hasChildren = (node.Plans?.length ?? 0) > 0
  const totalTime = node['Actual Total Time'] ?? node['Total Cost'] ?? 0
  const rows = node['Actual Rows'] ?? node['Plan Rows'] ?? 0

  const nodeLabel = [
    node['Node Type'],
    node['Relation Name'] ? `on ${node['Relation Name']}` : '',
    node['Alias'] && node['Alias'] !== node['Relation Name'] ? `(${node['Alias']})` : '',
    node['Index Name'] ? `using ${node['Index Name']}` : '',
  ].filter(Boolean).join(' ')

  const condition = node['Filter'] || node['Join Filter'] || node['Index Cond'] || node['Hash Cond'] || node['Merge Cond'] || ''

  return (
    <div>
      <div
        className="flex items-center gap-1"
        style={{
          paddingLeft: depth * 20 + 8,
          paddingRight: 8,
          height: 28,
          cursor: hasChildren ? 'pointer' : 'default',
          borderBottom: '1px solid var(--mai-border)',
        }}
        onClick={() => hasChildren && setExpanded(!expanded)}
        onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--mai-bg-hover)' }}
        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
      >
        {/* Expand/collapse */}
        <span style={{ width: 12, flexShrink: 0 }}>
          {hasChildren ? (
            expanded ? <ChevronDown size={10} style={{ color: 'var(--mai-text-3)' }} /> : <ChevronRight size={10} style={{ color: 'var(--mai-text-3)' }} />
          ) : null}
        </span>

        {/* Cost indicator dot */}
        <span
          style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: costColor(totalTime),
            flexShrink: 0,
          }}
        />

        {/* Node type */}
        <span style={{ fontSize: 11, color: 'var(--mai-text-1)', fontWeight: 500, marginRight: 4 }}>
          {nodeLabel}
        </span>

        {/* Condition */}
        {condition && (
          <span style={{ fontSize: 10, color: 'var(--mai-text-3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
            {condition}
          </span>
        )}

        <div className="flex-1" />

        {/* Stats */}
        <div className="flex items-center gap-3" style={{ flexShrink: 0 }}>
          {node['Actual Total Time'] != null && (
            <span className="flex items-center gap-1" style={{ fontSize: 10, color: timeColor(node['Actual Total Time']) }}>
              <Clock size={9} />
              {node['Actual Total Time'].toFixed(2)}ms
            </span>
          )}
          {node['Total Cost'] != null && node['Actual Total Time'] == null && (
            <span className="flex items-center gap-1" style={{ fontSize: 10, color: costColor(node['Total Cost']) }}>
              <Zap size={9} />
              {node['Total Cost'].toFixed(1)}
            </span>
          )}
          <span className="flex items-center gap-1" style={{ fontSize: 10, color: 'var(--mai-text-3)' }}>
            <Rows3 size={9} />
            {rows.toLocaleString()}
          </span>
        </div>
      </div>

      {/* Children */}
      {expanded && node.Plans?.map((child, i) => (
        <PlanNodeRow key={i} node={child} depth={depth + 1} />
      ))}
    </div>
  )
}

export function ExplainTree({ explainResult }: ExplainTreeProps) {
  const plan = parseExplainJSON(explainResult)

  if (!plan) {
    return (
      <div className="flex flex-col h-full overflow-auto p-4" style={{ background: 'var(--mai-bg-base)' }}>
        <div style={{ fontSize: 11, color: 'var(--mai-text-3)', marginBottom: 8 }}>
          Could not parse EXPLAIN output as JSON. Showing raw result:
        </div>
        <pre style={{ fontSize: 11, color: 'var(--mai-text-2)', fontFamily: "ui-monospace, 'SF Mono', monospace", whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>
          {explainResult}
        </pre>
      </div>
    )
  }

  const totalTime = plan['Actual Total Time'] ?? plan['Total Cost'] ?? 0
  const totalRows = plan['Actual Rows'] ?? plan['Plan Rows'] ?? 0

  return (
    <div className="flex flex-col h-full" style={{ background: 'var(--mai-bg-base)' }}>
      {/* Summary bar */}
      <div
        className="flex items-center gap-4 px-3 shrink-0"
        style={{ height: 28, borderBottom: '1px solid var(--mai-border)', background: 'var(--mai-bg-panel)' }}
      >
        <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--mai-text-3)' }}>Execution Plan</span>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1" style={{ fontSize: 10, color: timeColor(totalTime) }}>
            <Clock size={9} />
            Total: {plan['Actual Total Time'] != null ? `${totalTime.toFixed(2)}ms` : `cost ${totalTime.toFixed(1)}`}
          </span>
          <span className="flex items-center gap-1" style={{ fontSize: 10, color: 'var(--mai-text-3)' }}>
            <Rows3 size={9} />
            {totalRows.toLocaleString()} rows
          </span>
        </div>
        <div className="flex-1" />
        {/* Legend */}
        <div className="flex items-center gap-2" style={{ fontSize: 9, color: 'var(--mai-text-4)' }}>
          <span className="flex items-center gap-1"><span style={{ width: 5, height: 5, borderRadius: '50%', background: '#34D399', display: 'inline-block' }} />Fast</span>
          <span className="flex items-center gap-1"><span style={{ width: 5, height: 5, borderRadius: '50%', background: '#FBBF24', display: 'inline-block' }} />Moderate</span>
          <span className="flex items-center gap-1"><span style={{ width: 5, height: 5, borderRadius: '50%', background: '#F87171', display: 'inline-block' }} />Slow</span>
        </div>
      </div>

      {/* Tree */}
      <div className="flex-1 overflow-auto">
        <PlanNodeRow node={plan} />
      </div>
    </div>
  )
}
