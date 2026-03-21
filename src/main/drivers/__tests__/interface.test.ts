import { describe, it, expect } from 'vitest'
import { DataSourceError } from '../interface'

describe('DataSourceError', () => {
  it('has name DataSourceError', () => {
    const err = new DataSourceError('boom')
    expect(err.name).toBe('DataSourceError')
  })

  it('inherits from Error', () => {
    const err = new DataSourceError('boom')
    expect(err).toBeInstanceOf(Error)
  })

  it('stores message', () => {
    const err = new DataSourceError('something failed')
    expect(err.message).toBe('something failed')
  })

  it('stores optional code', () => {
    const err = new DataSourceError('msg', '42P01')
    expect(err.code).toBe('42P01')
  })

  it('code is undefined when not provided', () => {
    const err = new DataSourceError('msg')
    expect(err.code).toBeUndefined()
  })

  it('stores optional cause', () => {
    const cause = new Error('original')
    const err = new DataSourceError('wrapped', undefined, cause)
    expect(err.cause).toBe(cause)
  })

  it('cause is undefined when not provided', () => {
    const err = new DataSourceError('msg')
    expect(err.cause).toBeUndefined()
  })
})
