import { describe, it, expect } from 'vitest'
import { z } from 'zod'
import { parseBody, parseQuery } from '../lib/validation.ts'
import { ValidationError } from '../lib/errors.ts'

describe('parseBody', () => {
  const schema = z.object({
    title: z.string().min(1),
    priority: z.enum(['low', 'medium', 'high']).optional(),
  })

  it('should parse valid data', () => {
    const result = parseBody(schema, { title: 'Test issue', priority: 'high' })
    expect(result).toEqual({ title: 'Test issue', priority: 'high' })
  })

  it('should strip unknown fields', () => {
    const result = parseBody(schema, { title: 'Test', extra: 'field' })
    expect(result).toEqual({ title: 'Test' })
    expect((result as Record<string, unknown>).extra).toBeUndefined()
  })

  it('should throw ValidationError for invalid data', () => {
    expect(() => parseBody(schema, { title: '' })).toThrow(ValidationError)
  })

  it('should include field details in error', () => {
    try {
      parseBody(schema, { priority: 'invalid' })
      expect.fail('Should have thrown')
    } catch (err) {
      expect(err).toBeInstanceOf(ValidationError)
      const validationErr = err as ValidationError
      expect(validationErr.details).toBeDefined()
      expect(validationErr.details!.title).toBeDefined()
    }
  })
})

describe('parseQuery', () => {
  const schema = z.object({
    page: z.coerce.number().int().positive().default(1),
    pageSize: z.coerce.number().int().positive().max(100).default(20),
  })

  it('should parse valid query params', () => {
    const result = parseQuery(schema, { page: '2', pageSize: '50' })
    expect(result).toEqual({ page: 2, pageSize: 50 })
  })

  it('should use defaults for missing params', () => {
    const result = parseQuery(schema, {})
    expect(result).toEqual({ page: 1, pageSize: 20 })
  })

  it('should throw ValidationError for invalid query', () => {
    expect(() => parseQuery(schema, { page: 'abc' })).toThrow(ValidationError)
  })
})
