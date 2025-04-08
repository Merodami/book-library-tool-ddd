import { describe, it, expect, vi } from 'vitest'
import { RESERVATION_STATUS } from '@book-library-tool/types'
import { Reservation } from './Reservation.js'
import { randomUUID } from 'crypto'

describe('Reservation Entity', () => {
  // Use valid UUIDs in test data
  const validUserId = randomUUID()
  const validReservationId = randomUUID()
  const validIsbn = 'book-123'
  const now = new Date()
  const dueDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000) // one week later
  const validStatus = RESERVATION_STATUS.RESERVED
  const validFee = 3

  it('should create a valid reservation entity using create()', () => {
    const reservation = Reservation.create({
      reservationId: validReservationId, // Include the reservationId
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
    ).toThrow(/userId/)

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
    ).toThrow(/isbn/)

    // Missing reservedAt: cast to any to bypass compile-time type checking.
    expect(() =>
      Reservation.create({
        userId: validUserId,
        isbn: validIsbn,
        dueDate: dueDate.toISOString(),
        status: validStatus,
        feeCharged: validFee,
      } as any),
    ).toThrow(/reservedAt/)

    // Missing status: cast to any to bypass compile-time type checking.
    expect(() =>
      Reservation.create({
        userId: validUserId,
        isbn: validIsbn,
        reservedAt: now.toISOString(),
        dueDate: dueDate.toISOString(),
        feeCharged: validFee,
      } as any),
    ).toThrow(/status/)
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
    ).toThrow(/date-time/) // Match the actual error format

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
    ).toThrow(/Invalid time value/) // Match the actual error format
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
    ).toThrow(/status/) // Match the actual error format
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
    ).toThrow(/feeCharged/) // Match the actual error format
  })

  describe('markAsReturned', () => {
    it('should update the status to RETURNED and update the updatedAt field', () => {
      const reservation = Reservation.create({
        reservationId: validReservationId, // Include the reservationId
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

    it('should throw an error if the reservation is already returned or bought', () => {
      const reservation = Reservation.create({
        reservationId: validReservationId, // Include the reservationId
        userId: validUserId,
        isbn: validIsbn,
        reservedAt: now.toISOString(),
        dueDate: dueDate.toISOString(),
        status: RESERVATION_STATUS.RETURNED,
        feeCharged: validFee,
      })
      expect(() => reservation.markAsReturned()).toThrow(
        /Reservation cannot be returned/,
      )
    })
  })
})
