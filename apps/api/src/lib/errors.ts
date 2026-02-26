import type { Context } from 'hono'
import type { ApiError } from '@dolinear/shared'

export class AppError extends Error {
  statusCode: number
  details?: Record<string, string[]>

  constructor(
    statusCode: number,
    message: string,
    details?: Record<string, string[]>,
  ) {
    super(message)
    this.name = 'AppError'
    this.statusCode = statusCode
    this.details = details
  }

  toResponse(): ApiError {
    return {
      error: this.name,
      message: this.message,
      statusCode: this.statusCode,
      details: this.details,
    }
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super(404, `${resource} not found`)
    this.name = 'NotFoundError'
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: Record<string, string[]>) {
    super(400, message, details)
    this.name = 'ValidationError'
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized') {
    super(401, message)
    this.name = 'UnauthorizedError'
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden') {
    super(403, message)
    this.name = 'ForbiddenError'
  }
}

export function handleError(err: Error, c: Context) {
  if (err instanceof AppError) {
    return c.json(err.toResponse(), err.statusCode as 400)
  }

  return c.json(
    {
      error: 'InternalServerError',
      message: 'Internal server error',
      statusCode: 500,
    } satisfies ApiError,
    500,
  )
}
