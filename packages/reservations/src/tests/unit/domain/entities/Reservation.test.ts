import { schemas } from '@book-library-tool/api'
import {
  RESERVATION_CANCELLED,
  RESERVATION_CONFIRMED,
  RESERVATION_CREATED,
  RESERVATION_REJECTED,
} from '@book-library-tool/event-store'
import { RESERVATION_STATUS } from '@book-library-tool/types'
import { Reservation } from '@reservations/entities/Reservation.js'
import { describe, expect, it, vi } from 'vitest'

describe('Reservation Entity', () => {
  const mockUserId = 'user-123'
  const mockIsbn = '978-3-16-148410-0'
  const mockReservedAt = new Date('2024-04-17').toISOString()
  const mockDueDate = new Date('2024-04-22').toISOString()
  const mockFeeCharged = 10.99
  const mockRetailPrice = 29.99

  describe('Creation', () => {
    it('should create a new reservation with valid data', () => {
      const { reservation, event } = Reservation.create({
        userId: mockUserId,
        isbn: mockIsbn,
        reservedAt: mockReservedAt,
        dueDate: mockDueDate,
        feeCharged: mockFeeCharged,
        retailPrice: mockRetailPrice,
      } as schemas.ReservationDTO)

      expect(reservation).toBeInstanceOf(Reservation)
      expect(reservation.userId).toBe(mockUserId)
      expect(reservation.isbn).toBe(mockIsbn)
      expect(reservation.reservedAt.toISOString()).toBe(mockReservedAt)
      expect(reservation.dueDate.toISOString()).toBe(mockDueDate)
      expect(reservation.status).toBe(RESERVATION_STATUS.CREATED)
      expect(reservation.feeCharged).toBe(mockFeeCharged)
      expect(reservation.retailPrice).toBe(mockRetailPrice)
      expect(reservation.bookBrought).toBe(false)

      expect(event).toBeDefined()
      expect(event.eventType).toBe(RESERVATION_CREATED)
    })

    it('should calculate due date if not provided', () => {
      vi.stubEnv('BOOK_RETURN_DUE_DATE_DAYS', '7')

      const { reservation } = Reservation.create({
        userId: mockUserId,
        isbn: mockIsbn,
        reservedAt: mockReservedAt,
      } as schemas.ReservationDTO)

      const expectedDueDate = new Date(mockReservedAt)

      expectedDueDate.setDate(expectedDueDate.getDate() + 7)

      expect(reservation.dueDate.toISOString()).toBe(
        expectedDueDate.toISOString(),
      )
    })
  })

  describe('Status Transitions', () => {
    it('should confirm a pending reservation', () => {
      const { reservation } = Reservation.create({
        userId: mockUserId,
        isbn: mockIsbn,
      } as schemas.ReservationDTO)

      reservation.setPaymentPending()

      const { event } = reservation.confirm(
        'payment-ref-123',
        'credit-card',
        mockFeeCharged,
      )

      expect(reservation.status).toBe(RESERVATION_STATUS.RESERVED)
      expect(event.eventType).toBe(RESERVATION_CONFIRMED)
    })

    it('should cancel a reservation', () => {
      const { reservation } = Reservation.create({
        userId: mockUserId,
        isbn: mockIsbn,
      } as schemas.ReservationDTO)

      reservation.setPaymentPending()
      reservation.confirm('payment-ref-123', 'credit-card', mockFeeCharged)

      const { event } = reservation.cancel('User requested cancellation')

      expect(reservation.status).toBe(RESERVATION_STATUS.CANCELLED)
      expect(event.eventType).toBe(RESERVATION_CANCELLED)
    })

    it('should reject a reservation', () => {
      const { reservation } = Reservation.create({
        userId: mockUserId,
        isbn: mockIsbn,
      } as schemas.ReservationDTO)

      const { event } = reservation.reject('Book not available')

      expect(reservation.status).toBe(RESERVATION_STATUS.REJECTED)
      expect(event.eventType).toBe(RESERVATION_REJECTED)
    })
  })

  describe('Business Rules', () => {
    it('should not allow confirming a non-pending payment reservation', () => {
      const { reservation } = Reservation.create({
        userId: mockUserId,
        isbn: mockIsbn,
      } as schemas.ReservationDTO)

      expect(() =>
        reservation.confirm('payment-ref-123', 'credit-card', mockFeeCharged),
      ).toThrow()
    })

    it('should not allow cancelling a non-reserved reservation', () => {
      const { reservation } = Reservation.create({
        userId: mockUserId,
        isbn: mockIsbn,
      } as schemas.ReservationDTO)

      expect(() => reservation.cancel('reason')).toThrow()
    })

    it('should not allow rejecting a non-pending reservation', () => {
      const { reservation } = Reservation.create({
        userId: mockUserId,
        isbn: mockIsbn,
      } as schemas.ReservationDTO)

      reservation.setPaymentPending()
      reservation.confirm('payment-ref-123', 'credit-card', mockFeeCharged)

      expect(() => reservation.reject('reason')).toThrow()
    })
  })

  describe('Event Handling', () => {
    it('should apply ReservationCreated event correctly', () => {
      const { reservation: _reservation, event } = Reservation.create({
        userId: mockUserId,
        isbn: mockIsbn,
        reservedAt: mockReservedAt,
        dueDate: mockDueDate,
        feeCharged: mockFeeCharged,
        retailPrice: mockRetailPrice,
      } as schemas.ReservationDTO)

      const { reservation: newReservation } = Reservation.create({
        userId: mockUserId,
        isbn: mockIsbn,
        reservedAt: mockReservedAt,
        dueDate: mockDueDate,
        feeCharged: mockFeeCharged,
        retailPrice: mockRetailPrice,
      } as schemas.ReservationDTO)

      newReservation.rehydrate([event])

      expect(newReservation.userId).toBe(mockUserId)
      expect(newReservation.isbn).toBe(mockIsbn)
      expect(newReservation.reservedAt.toISOString()).toBe(mockReservedAt)
      expect(newReservation.dueDate.toISOString()).toBe(mockDueDate)
      expect(newReservation.status).toBe(RESERVATION_STATUS.CREATED)
      expect(newReservation.feeCharged).toBe(mockFeeCharged)
      expect(newReservation.retailPrice).toBe(mockRetailPrice)
    })
  })
})
