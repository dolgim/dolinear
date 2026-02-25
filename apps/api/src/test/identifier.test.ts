import { describe, it, expect } from 'vitest'
import { validateIdentifier } from '../lib/identifier.js'

describe('validateIdentifier', () => {
  it('should accept 2-letter uppercase identifier', () => {
    expect(validateIdentifier('AB')).toBe(true)
  })

  it('should accept 3-letter uppercase identifier', () => {
    expect(validateIdentifier('ABC')).toBe(true)
  })

  it('should accept 5-letter uppercase identifier', () => {
    expect(validateIdentifier('ABCDE')).toBe(true)
  })

  it('should reject single letter (too short)', () => {
    expect(validateIdentifier('A')).toBe(false)
  })

  it('should reject 6+ letters (too long)', () => {
    expect(validateIdentifier('ABCDEF')).toBe(false)
  })

  it('should reject lowercase letters', () => {
    expect(validateIdentifier('abc')).toBe(false)
  })

  it('should reject mixed case', () => {
    expect(validateIdentifier('Abc')).toBe(false)
  })

  it('should reject digits', () => {
    expect(validateIdentifier('AB1')).toBe(false)
  })

  it('should reject empty string', () => {
    expect(validateIdentifier('')).toBe(false)
  })

  it('should reject identifiers with hyphens', () => {
    expect(validateIdentifier('A-B')).toBe(false)
  })

  it('should reject identifiers with spaces', () => {
    expect(validateIdentifier('A B')).toBe(false)
  })
})
