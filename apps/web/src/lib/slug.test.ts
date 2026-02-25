import { describe, it, expect } from 'vitest'
import { generateSlug } from './slug'

describe('generateSlug', () => {
  it('converts name to lowercase kebab-case', () => {
    expect(generateSlug('My Workspace')).toBe('my-workspace')
  })

  it('removes special characters', () => {
    expect(generateSlug('Hello @World! #2024')).toBe('hello-world-2024')
  })

  it('collapses multiple hyphens into one', () => {
    expect(generateSlug('foo---bar')).toBe('foo-bar')
  })

  it('removes leading and trailing hyphens', () => {
    expect(generateSlug('--hello--')).toBe('hello')
  })

  it('trims whitespace before processing', () => {
    expect(generateSlug('  spaced out  ')).toBe('spaced-out')
  })

  it('returns empty string for empty input', () => {
    expect(generateSlug('')).toBe('')
  })

  it('handles only special characters', () => {
    expect(generateSlug('!@#$%')).toBe('')
  })
})
