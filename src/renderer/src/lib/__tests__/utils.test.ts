import { describe, it, expect } from 'vitest'
import { cn } from '../utils'

describe('cn()', () => {
  it('returns a single class unchanged', () => {
    expect(cn('foo')).toBe('foo')
  })

  it('joins multiple class strings', () => {
    expect(cn('foo', 'bar')).toBe('foo bar')
  })

  it('filters out falsy values', () => {
    expect(cn('foo', undefined, null, false, 'bar')).toBe('foo bar')
  })

  it('merges Tailwind conflicting classes (last wins)', () => {
    // tailwind-merge resolves: p-4 then p-2 → p-2
    expect(cn('p-4', 'p-2')).toBe('p-2')
  })

  it('handles conditional object syntax from clsx', () => {
    const isActive = true
    const isDisabled = false
    expect(cn({ 'text-blue-500': isActive, 'text-gray-300': isDisabled })).toBe('text-blue-500')
  })

  it('handles array input from clsx', () => {
    expect(cn(['foo', 'bar'])).toBe('foo bar')
  })

  it('returns empty string when given no arguments', () => {
    expect(cn()).toBe('')
  })

  it('handles mixed clsx and tailwind-merge patterns', () => {
    const base = 'px-4 py-2 rounded'
    const override = 'px-6' // overrides px-4
    expect(cn(base, override)).toBe('py-2 rounded px-6')
  })
})
