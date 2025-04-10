import { describe, expect, it } from 'vitest'

import type { ErrorData } from '../src/errors/ErrorData.js'
import { ApplicationError, catchError } from './errors.js'

const sampleData: ErrorData = { content: ['/price: must be number'] }

describe('ApplicationError helpers', () => {
  it('BadRequest() keeps status, message and data intact', () => {
    const err = ApplicationError.BadRequest('VALIDATION_ERROR', sampleData)

    expect(err).toBeInstanceOf(ApplicationError)
    expect(err.status).toBe(400)
    expect(err.message).toBe('VALIDATION_ERROR')
    expect(err.content).toBe(sampleData)
  })

  it('isApplicationError() recognises only ApplicationError', () => {
    const appErr = ApplicationError.BadRequest()
    const other = new Error('boom')

    expect(ApplicationError.isApplicationError(appErr)).toBe(true)
    expect(ApplicationError.isApplicationError(other)).toBe(false)
  })
})

describe('catchError()', () => {
  it('wraps a TypeORM “EntityNotFound” error into 404 ApplicationError', () => {
    const ormErr = new Error('missing')
    ormErr.name = 'EntityNotFound'

    const fn = catchError('Book', '123')

    expect(fn.bind(null, ormErr)).toThrowErrorMatchingInlineSnapshot(
      '[Error: Unknown Book "123"]',
    )
  })

  it('re‑throws any other error unchanged', () => {
    const original = new Error('db down')
    const fn = catchError('Book', '123')

    expect(fn.bind(null, original)).toThrow(original)
  })
})
