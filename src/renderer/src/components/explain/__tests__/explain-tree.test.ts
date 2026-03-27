import { describe, it, expect } from 'vitest'

// Mock lucide-react and react since we only test pure exported functions
vi.mock('react', () => ({ useState: vi.fn() }))
vi.mock('lucide-react', () => ({
  ChevronRight: {},
  ChevronDown: {},
  Zap: {},
  Clock: {},
  Rows3: {},
}))

import { parseExplainJSON, costColor, timeColor } from '../ExplainTree'

// ─── parseExplainJSON ─────────────────────────────────────────────────────────

describe('parseExplainJSON', () => {
  it('parses PostgreSQL EXPLAIN FORMAT JSON output (array wrapper)', () => {
    const plan = { 'Node Type': 'Seq Scan', 'Total Cost': 5.5, 'Plan Rows': 10 }
    const result = parseExplainJSON(JSON.stringify([{ Plan: plan }]))
    expect(result).toEqual(plan)
  })

  it('parses direct object with Plan key', () => {
    const plan = { 'Node Type': 'Index Scan', 'Total Cost': 1.5 }
    const result = parseExplainJSON(JSON.stringify({ Plan: plan }))
    expect(result).toEqual(plan)
  })

  it('parses direct plan node (no wrapper)', () => {
    const plan = { 'Node Type': 'Hash Join', 'Total Cost': 99.0 }
    const result = parseExplainJSON(JSON.stringify(plan))
    expect(result).toEqual(plan)
  })

  it('returns null for invalid JSON', () => {
    expect(parseExplainJSON('not valid json')).toBeNull()
  })

  it('returns null for empty string', () => {
    expect(parseExplainJSON('')).toBeNull()
  })

  it('returns null for JSON with no recognizable plan shape', () => {
    expect(parseExplainJSON(JSON.stringify({ foo: 'bar' }))).toBeNull()
  })

  it('returns null for empty array', () => {
    expect(parseExplainJSON(JSON.stringify([]))).toBeNull()
  })

  it('returns null for array without Plan key', () => {
    expect(parseExplainJSON(JSON.stringify([{ other: 'data' }]))).toBeNull()
  })

  it('preserves nested Plans array', () => {
    const child = { 'Node Type': 'Seq Scan', 'Total Cost': 1.0 }
    const parent = { 'Node Type': 'Hash Join', 'Total Cost': 10.0, Plans: [child] }
    const result = parseExplainJSON(JSON.stringify([{ Plan: parent }]))
    expect(result?.Plans).toHaveLength(1)
    expect(result?.Plans?.[0]['Node Type']).toBe('Seq Scan')
  })

  it('preserves all plan metadata fields', () => {
    const plan = {
      'Node Type': 'Index Scan',
      'Relation Name': 'users',
      'Alias': 'u',
      'Startup Cost': 0.28,
      'Total Cost': 8.3,
      'Plan Rows': 1,
      'Plan Width': 100,
      'Actual Startup Time': 0.05,
      'Actual Total Time': 0.07,
      'Actual Rows': 1,
      'Actual Loops': 1,
      'Index Name': 'users_pkey',
      'Index Cond': '(id = 42)',
    }
    const result = parseExplainJSON(JSON.stringify([{ Plan: plan }]))
    expect(result).toMatchObject(plan)
  })
})

// ─── costColor ────────────────────────────────────────────────────────────────

describe('costColor', () => {
  it('returns green for cost < 10', () => {
    expect(costColor(0)).toBe('#34D399')
    expect(costColor(5)).toBe('#34D399')
    expect(costColor(9.99)).toBe('#34D399')
  })

  it('returns yellow for cost 10–99', () => {
    expect(costColor(10)).toBe('#FBBF24')
    expect(costColor(50)).toBe('#FBBF24')
    expect(costColor(99.99)).toBe('#FBBF24')
  })

  it('returns orange for cost 100–999', () => {
    expect(costColor(100)).toBe('#F97316')
    expect(costColor(500)).toBe('#F97316')
    expect(costColor(999.99)).toBe('#F97316')
  })

  it('returns red for cost >= 1000', () => {
    expect(costColor(1000)).toBe('#F87171')
    expect(costColor(9999)).toBe('#F87171')
  })

  it('returns green for cost 0 (boundary)', () => {
    expect(costColor(0)).toBe('#34D399')
  })
})

// ─── timeColor ────────────────────────────────────────────────────────────────

describe('timeColor', () => {
  it('returns green for time < 1ms', () => {
    expect(timeColor(0)).toBe('#34D399')
    expect(timeColor(0.5)).toBe('#34D399')
    expect(timeColor(0.99)).toBe('#34D399')
  })

  it('returns yellow for time 1–9ms', () => {
    expect(timeColor(1)).toBe('#FBBF24')
    expect(timeColor(5)).toBe('#FBBF24')
    expect(timeColor(9.99)).toBe('#FBBF24')
  })

  it('returns orange for time 10–99ms', () => {
    expect(timeColor(10)).toBe('#F97316')
    expect(timeColor(50)).toBe('#F97316')
    expect(timeColor(99.99)).toBe('#F97316')
  })

  it('returns red for time >= 100ms', () => {
    expect(timeColor(100)).toBe('#F87171')
    expect(timeColor(1000)).toBe('#F87171')
  })
})
