import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { RESERVATION_STATUS } from '@book-library-tool/types'
import { Reservation } from './Reservation.js'
import { randomUUID } from 'crypto'
import { Errors } from '@book-library-tool/shared'

describe('Reservation Entity', () => {
  // Use valid UUIDs in test data
  const validUserId = randomUUID()
  const validReservationId = randomUUID()
  const validIsbn = 'book-123'
  const now = new Date()
  const dueDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000) // one week later
  const validStatus = RESERVATION_STATUS.RESERVED
  const validFee = 3

  beforeEach(() => {
    // Mock environment variables
    vi.stubEnv('BOOK_RETURN_DUE_DATE_DAYS', '5')
    vi.stubEnv('BOOK_RESERVATION_FEE', '3')
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.useRealTimers()
  })

  it('should create a valid reservation entity using create()', () => {
    const reservation = Reservation.create({
      reservationId: validReservationId,
      userId: validUserId,
      isbn: validIsbn,
      reservedAt: now.toISOString(),
      status: validStatus,
      dueDate: dueDate.toISOString(),
      feeCharged: validFee,
    })

    expect(reservation.reservationId).toBe(validReservationId)
    expect(reservation.userId).toBe(validUserId)
    expect(reservation.isbn).toBe(validIsbn)
    expect(reservation.reservedAt).toEqual(new Date(now.toISOString()))
    expect(reservation.dueDate).toEqual(new Date(dueDate.toISOString()))
    expect(reservation.status).toBe(validStatus)
    expect(reservation.feeCharged).toBe(validFee)
    expect(reservation.createdAt).toBeInstanceOf(Date)
    expect(reservation.updatedAt).toBeInstanceOf(Date)
  })

  it('should use default values when not provided', () => {
    // Setup
    const originalDateNow = Date.now
    const mockNow = now.getTime()
    Date.now = vi.fn(() => mockNow)
    vi.useFakeTimers()
    vi.setSystemTime(now)

    // Test without providing reservationId, dueDate, or feeCharged
    const reservation = Reservation.create({
      userId: validUserId,
      isbn: validIsbn,
      reservedAt: now.toISOString(),
      status: validStatus,
    })

    // Assertions
    expect(reservation.reservationId).toBeDefined() // Should generate UUID
    expect(reservation.userId).toBe(validUserId)
    expect(reservation.isbn).toBe(validIsbn)
    expect(reservation.reservedAt).toEqual(new Date(now.toISOString()))
    // Default dueDate should be 5 days from now (from env variable)
    const expectedDueDate = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000)
    expect(reservation.dueDate.getDate()).toBe(expectedDueDate.getDate())
    expect(reservation.status).toBe(validStatus)
    expect(reservation.feeCharged).toBe(3) // Default from env variable

    // Cleanup
    Date.now = originalDateNow
  })

  it('should throw an error if required fields are missing', () => {
    // Empty userId should trigger a validation error.
    expect(() =>
      Reservation.create({
        userId: '',
        isbn: validIsbn,
        reservedAt: now.toISOString(),
        dueDate: dueDate.toISOString(),
        status: validStatus,
        feeCharged: validFee,
      }),
    ).toThrow('VALIDATION_ERROR')

    // Empty isbn should trigger a validation error.
    expect(() =>
      Reservation.create({
        userId: validUserId,
        isbn: '',
        reservedAt: now.toISOString(),
        dueDate: dueDate.toISOString(),
        status: validStatus,
        feeCharged: validFee,
      }),
    ).toThrow('VALIDATION_ERROR')

    // Missing reservedAt: cast to any to bypass compile-time type checking.
    expect(() =>
      Reservation.create({
        userId: validUserId,
        isbn: validIsbn,
        dueDate: dueDate.toISOString(),
        status: validStatus,
        feeCharged: validFee,
      } as any),
    ).toThrow('VALIDATION_ERROR')

    // Missing status: cast to any to bypass compile-time type checking.
    expect(() =>
      Reservation.create({
        userId: validUserId,
        isbn: validIsbn,
        reservedAt: now.toISOString(),
        dueDate: dueDate.toISOString(),
        feeCharged: validFee,
      } as any),
    ).toThrow('VALIDATION_ERROR')
  })

  it('should throw an error if dates are invalid', () => {
    // Invalid reservedAt date
    expect(() =>
      Reservation.create({
        userId: validUserId,
        isbn: validIsbn,
        reservedAt: 'invalid-date',
        dueDate: dueDate.toISOString(),
        status: validStatus,
        feeCharged: validFee,
      }),
    ).toThrow() // The exact error message depends on the validator implementation

    // Invalid dueDate if provided
    expect(() =>
      Reservation.create({
        userId: validUserId,
        isbn: validIsbn,
        reservedAt: now.toISOString(),
        dueDate: 'invalid-date',
        status: validStatus,
        feeCharged: validFee,
      }),
    ).toThrow() // The exact error message depends on the validator implementation
  })

  it('should throw an error if status is invalid', () => {
    expect(() =>
      Reservation.create({
        userId: validUserId,
        isbn: validIsbn,
        reservedAt: now.toISOString(),
        dueDate: dueDate.toISOString(),
        status: 'invalid' as any,
        feeCharged: validFee,
      }),
    ).toThrow() // Match the actual error format
  })

  it('should throw an error if feeCharged is negative', () => {
    expect(() =>
      Reservation.create({
        userId: validUserId,
        isbn: validIsbn,
        reservedAt: now.toISOString(),
        dueDate: dueDate.toISOString(),
        status: validStatus,
        feeCharged: -1,
      }),
    ).toThrow() // Match the actual error format
  })

  it('should rehydrate a reservation from DTO', () => {
    const createdAt = new Date(now.getTime() - 1000 * 60 * 60) // 1 hour ago
    const updatedAt = new Date(now.getTime() - 1000 * 60 * 30) // 30 minutes ago

    const dto = {
      reservationId: validReservationId,
      userId: validUserId,
      isbn: validIsbn,
      reservedAt: now.toISOString(),
      dueDate: dueDate.toISOString(),
      status: validStatus,
      feeCharged: validFee,
      createdAt: createdAt.toISOString(),
      updatedAt: updatedAt.toISOString(),
    }

    const reservation = Reservation.rehydrate(dto)

    expect(reservation.reservationId).toBe(validReservationId)
    expect(reservation.userId).toBe(validUserId)
    expect(reservation.isbn).toBe(validIsbn)
    expect(reservation.reservedAt).toEqual(new Date(now.toISOString()))
    expect(reservation.dueDate).toEqual(new Date(dueDate.toISOString()))
    expect(reservation.status).toBe(validStatus)
    expect(reservation.feeCharged).toBe(validFee)
    expect(reservation.createdAt).toEqual(createdAt)
    expect(reservation.updatedAt).toEqual(updatedAt)
  })

  describe('markAsReturned', () => {
    it('should update the status to RETURNED and update the updatedAt field', () => {
      const reservation = Reservation.create({
        reservationId: validReservationId,
        userId: validUserId,
        isbn: validIsbn,
        reservedAt: now.toISOString(),
        dueDate: dueDate.toISOString(),
        status: RESERVATION_STATUS.BORROWED,
        feeCharged: validFee,
      })

      // Sleep for a small amount of time to ensure time difference
      const oldUpdatedAt = reservation.updatedAt.getTime()

      // Mock the timers to control the passage of time
      vi.useFakeTimers()

      // Force updatedAt to be different
      vi.advanceTimersByTime(1000)

      reservation.markAsReturned()
      expect(reservation.status).toBe(RESERVATION_STATUS.RETURNED)
      expect(reservation.updatedAt.getTime()).toBeGreaterThan(oldUpdatedAt)
    })

    it('should allow returning a reservation with RESERVED status', () => {
      const reservation = Reservation.create({
        reservationId: validReservationId,
        userId: validUserId,
        isbn: validIsbn,
        reservedAt: now.toISOString(),
        dueDate: dueDate.toISOString(),
        status: RESERVATION_STATUS.RESERVED,
        feeCharged: validFee,
      })

      expect(() => reservation.markAsReturned()).not.toThrow()
      expect(reservation.status).toBe(RESERVATION_STATUS.RETURNED)
    })

    it('should allow returning a reservation with LATE status', () => {
      const reservation = Reservation.create({
        reservationId: validReservationId,
        userId: validUserId,
        isbn: validIsbn,
        reservedAt: now.toISOString(),
        dueDate: dueDate.toISOString(),
        status: RESERVATION_STATUS.LATE,
        feeCharged: validFee,
      })

      expect(() => reservation.markAsReturned()).not.toThrow()
      expect(reservation.status).toBe(RESERVATION_STATUS.RETURNED)
    })

    it('should throw an ApplicationError if the reservation is already returned', () => {
      const reservation = Reservation.create({
        reservationId: validReservationId,
        userId: validUserId,
        isbn: validIsbn,
        reservedAt: now.toISOString(),
        dueDate: dueDate.toISOString(),
        status: RESERVATION_STATUS.RETURNED,
        feeCharged: validFee,
      })

      try {
        reservation.markAsReturned()
        // If we reach here, the test fails
        expect(true).toBe(false)
      } catch (error) {
        expect(error).toBeInstanceOf(Errors.ApplicationError)
        expect((error as Errors.ApplicationError).status).toBe(400)
        expect((error as Errors.ApplicationError).message).toBe(
          'RESERVATION_CANNOT_BE_RETURNED',
        )
      }
    })

    it('should throw an ApplicationError if the reservation is bought', () => {
      const reservation = Reservation.create({
        reservationId: validReservationId,
        userId: validUserId,
        isbn: validIsbn,
        reservedAt: now.toISOString(),
        dueDate: dueDate.toISOString(),
        status: RESERVATION_STATUS.BOUGHT,
        feeCharged: validFee,
      })

      try {
        reservation.markAsReturned()
        // If we reach here, the test fails
        expect(true).toBe(false)
      } catch (error) {
        expect(error).toBeInstanceOf(Errors.ApplicationError)
        expect((error as Errors.ApplicationError).status).toBe(400)
        expect((error as Errors.ApplicationError).message).toBe(
          'RESERVATION_CANNOT_BE_RETURNED',
        )
      }
    })
  })
})
