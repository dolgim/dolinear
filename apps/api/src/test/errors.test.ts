import { describe, it, expect } from 'vitest'
import {
  AppError,
  NotFoundError,
  ValidationError,
  UnauthorizedError,
  ForbiddenError,
} from '../lib/errors.js'

describe('AppError', () => {
  it('should create an error with status code and message', () => {
    const err = new AppError(400, 'Bad request')
    expect(err.statusCode).toBe(400)
    expect(err.message).toBe('Bad request')
    expect(err.name).toBe('AppError')
    expect(err).toBeInstanceOf(Error)
  })

  it('should include details in response', () => {
    const details = { field: ['is required'] }
    const err = new AppError(400, 'Validation failed', details)
    const response = err.toResponse()

    expect(response).toEqual({
      error: 'AppError',
      message: 'Validation failed',
      statusCode: 400,
      details,
    })
  })

  it('should omit details when not provided', () => {
    const err = new AppError(500, 'Server error')
    const response = err.toResponse()

    expect(response.details).toBeUndefined()
  })
})

describe('NotFoundError', () => {
  it('should create a 404 error', () => {
    const err = new NotFoundError('Issue')
    expect(err.statusCode).toBe(404)
    expect(err.message).toBe('Issue not found')
    expect(err.name).toBe('NotFoundError')
  })
})

describe('ValidationError', () => {
  it('should create a 400 error with details', () => {
    const details = { title: ['is required'], status: ['is invalid'] }
    const err = new ValidationError('Validation failed', details)
    expect(err.statusCode).toBe(400)
    expect(err.details).toEqual(details)
    expect(err.name).toBe('ValidationError')
  })
})

describe('UnauthorizedError', () => {
  it('should create a 401 error with default message', () => {
    const err = new UnauthorizedError()
    expect(err.statusCode).toBe(401)
    expect(err.message).toBe('Unauthorized')
  })

  it('should accept custom message', () => {
    const err = new UnauthorizedError('Invalid token')
    expect(err.message).toBe('Invalid token')
  })
})

describe('ForbiddenError', () => {
  it('should create a 403 error', () => {
    const err = new ForbiddenError()
    expect(err.statusCode).toBe(403)
    expect(err.message).toBe('Forbidden')
  })
})
