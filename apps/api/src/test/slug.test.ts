import { describe, it, expect } from 'vitest'
import { generateSlug, generateUniqueSlug } from '../lib/slug.ts'

describe('generateSlug', () => {
  it('should convert name to lowercase kebab-case', () => {
    expect(generateSlug('My Workspace')).toBe('my-workspace')
  })

  it('should replace special characters with hyphens', () => {
    expect(generateSlug('Hello World! @#$')).toBe('hello-world')
  })

  it('should trim whitespace', () => {
    expect(generateSlug('  spaced  ')).toBe('spaced')
  })

  it('should collapse multiple hyphens', () => {
    expect(generateSlug('a---b---c')).toBe('a-b-c')
  })

  it('should remove leading and trailing hyphens', () => {
    expect(generateSlug('---hello---')).toBe('hello')
  })

  it('should handle unicode characters', () => {
    expect(generateSlug('café résumé')).toBe('caf-r-sum')
  })

  it('should handle numbers', () => {
    expect(generateSlug('Team 42')).toBe('team-42')
  })
})

describe('generateUniqueSlug', () => {
  it('should return base slug when it does not exist', async () => {
    const slug = await generateUniqueSlug('my-workspace', async () => false)
    expect(slug).toBe('my-workspace')
  })

  it('should append counter when base slug exists', async () => {
    const existing = new Set(['my-workspace'])
    const slug = await generateUniqueSlug('my-workspace', async (s) =>
      existing.has(s),
    )
    expect(slug).toBe('my-workspace-2')
  })

  it('should increment counter until unique slug is found', async () => {
    const existing = new Set([
      'my-workspace',
      'my-workspace-2',
      'my-workspace-3',
    ])
    const slug = await generateUniqueSlug('my-workspace', async (s) =>
      existing.has(s),
    )
    expect(slug).toBe('my-workspace-4')
  })
})
