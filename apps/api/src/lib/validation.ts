import type { Context } from 'hono'
import { z } from 'zod'
import { ValidationError } from './errors.ts'

export function parseBody<T extends z.ZodType>(
  schema: T,
  data: unknown,
): z.infer<T> {
  const result = schema.safeParse(data)
  if (!result.success) {
    const details = formatZodErrors(result.error)
    throw new ValidationError('Validation failed', details)
  }
  return result.data
}

export function parseQuery<T extends z.ZodType>(
  schema: T,
  query: Record<string, string | string[] | undefined>,
): z.infer<T> {
  const result = schema.safeParse(query)
  if (!result.success) {
    const details = formatZodErrors(result.error)
    throw new ValidationError('Invalid query parameters', details)
  }
  return result.data
}

export async function validateRequest<T extends z.ZodType>(
  c: Context,
  schema: T,
): Promise<z.infer<T>> {
  const body = await c.req.json()
  return parseBody(schema, body)
}

function formatZodErrors(error: z.ZodError): Record<string, string[]> {
  const details: Record<string, string[]> = {}
  for (const issue of error.issues) {
    const path = issue.path.join('.') || '_root'
    if (!details[path]) {
      details[path] = []
    }
    details[path].push(issue.message)
  }
  return details
}
