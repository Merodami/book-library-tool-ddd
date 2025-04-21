import { schemas } from '@book-library-tool/api'
import { DomainEvent } from '@book-library-tool/event-store'
import { RESERVATION_STATUS } from '@book-library-tool/types'
import { Reservation } from '@reservations/entities/Reservation.js'
import { IReservationRepository } from '@reservations/repositories/IReservationRepository.js'
import { describe, expect, it, vi } from 'vitest'

describe('IReservationRepository', () => {
  const mockRepository = {
    saveEvents: vi.fn(),
    appendBatch: vi.fn(),
    getEventsForAggregate: vi.fn(),
    createReservation: vi.fn(),
    returnReservation: vi.fn(),
    cancelReservation: vi.fn(),
    findById: vi.fn(),
    findActiveByUserAndBookId: vi.fn(),
  } as unknown as IReservationRepository

  const mockUserId = 'a5123456-7890-1234-5678-901234567890'
  const mockBookId = '5a123456-7890-1234-5678-901234567890'
  const mockId = '8a123456-7890-1234-5678-901234567890'
  const mockEvents: DomainEvent[] = [
    {
      eventType: 'ReservationCreated',
      aggregateId: mockId,
      version: 1,
      schemaVersion: 1,
      timestamp: new Date(),
      payload: {},
    },
  ]

  describe('saveEvents', () => {
    it('should save events for an aggregate', async () => {
      await mockRepository.saveEvents(mockId, mockEvents, 0)
      expect(mockRepository.saveEvents).toHaveBeenCalledWith(
        mockId,
        mockEvents,
        0,
      )
    })
  })

  describe('appendBatch', () => {
    it('should append a batch of events', async () => {
      await mockRepository.appendBatch(mockId, mockEvents, 0)
      expect(mockRepository.appendBatch).toHaveBeenCalledWith(
        mockId,
        mockEvents,
        0,
      )
    })
  })

  describe('getEventsForAggregate', () => {
    it('should retrieve events for an aggregate', async () => {
      vi.mocked(mockRepository.getEventsForAggregate).mockResolvedValue(
        mockEvents,
      )

      const events = await mockRepository.getEventsForAggregate(mockId)

      expect(events).toEqual(mockEvents)
      expect(mockRepository.getEventsForAggregate).toHaveBeenCalledWith(mockId)
    })
  })

  describe('createReservation', () => {
    it('should create a new reservation', async () => {
      const { reservation: mockReservation } = Reservation.create({
        userId: mockUserId,
        bookId: mockBookId,
      })

      vi.mocked(mockRepository.createReservation).mockResolvedValue(
        mockReservation,
      )

      const reservation = await mockRepository.createReservation({
        userId: mockUserId,
        bookId: mockBookId,
      } as schemas.ReservationRequest)

      expect(reservation).toBeInstanceOf(Reservation)
      expect(mockRepository.createReservation).toHaveBeenCalledWith({
        userId: mockUserId,
        bookId: mockBookId,
      })
    })
  })

  describe('returnReservation', () => {
    it('should mark a reservation as returned', async () => {
      const { reservation: mockReservation } = Reservation.create({
        userId: mockUserId,
        bookId: mockBookId,
      })

      // Manually set the status to RETURNED for the test
      mockReservation.status = RESERVATION_STATUS.RETURNED

      vi.mocked(mockRepository.returnReservation).mockResolvedValue(
        mockReservation,
      )

      const reservation = await mockRepository.returnReservation(mockId)

      expect(reservation.status).toBe(RESERVATION_STATUS.RETURNED)
      expect(mockRepository.returnReservation).toHaveBeenCalledWith(mockId)
    })
  })

  describe('cancelReservation', () => {
    it('should cancel a reservation', async () => {
      const { reservation: mockReservation } = Reservation.create({
        userId: mockUserId,
        bookId: mockBookId,
      })

      // Manually set the status to CANCELLED for the test
      mockReservation.status = RESERVATION_STATUS.CANCELLED

      vi.mocked(mockRepository.cancelReservation).mockResolvedValue(
        mockReservation,
      )

      const reservation = await mockRepository.cancelReservation(
        mockId,
        'User requested cancellation',
      )

      expect(reservation.status).toBe(RESERVATION_STATUS.CANCELLED)
      expect(mockRepository.cancelReservation).toHaveBeenCalledWith(
        mockId,
        'User requested cancellation',
      )
    })
  })

  describe('findById', () => {
    it('should find a reservation by ID', async () => {
      const { reservation: mockReservation } = Reservation.create({
        userId: mockUserId,
        bookId: mockBookId,
      })

      vi.mocked(mockRepository.findById).mockResolvedValue(mockReservation)

      const reservation = await mockRepository.findById(mockId)

      expect(reservation).toBeInstanceOf(Reservation)
      expect(mockRepository.findById).toHaveBeenCalledWith(mockId)
    })

    it('should return null when reservation is not found', async () => {
      vi.mocked(mockRepository.findById).mockResolvedValue(null)

      const reservation = await mockRepository.findById('non-existent-id')

      expect(reservation).toBeNull()
    })
  })

  describe('findActiveByUserAndBookId', () => {
    it('should find an active reservation by user and bookId', async () => {
      const { reservation: mockReservation } = Reservation.create({
        userId: mockUserId,
        bookId: mockBookId,
      })

      // Manually set the status to RESERVED for the test
      mockReservation.status = RESERVATION_STATUS.RESERVED

      vi.mocked(mockRepository.findActiveByUserAndBookId).mockResolvedValue(
        mockReservation,
      )

      const reservation = await mockRepository.findActiveByUserAndBookId(
        mockUserId,
        mockBookId,
      )

      expect(reservation).toBeInstanceOf(Reservation)
      expect(mockRepository.findActiveByUserAndBookId).toHaveBeenCalledWith(
        mockUserId,
        mockBookId,
      )
    })

    it('should return null when no active reservation is found', async () => {
      vi.mocked(mockRepository.findActiveByUserAndBookId).mockResolvedValue(
        null,
      )

      const reservation = await mockRepository.findActiveByUserAndBookId(
        mockUserId,
        mockBookId,
      )

      expect(reservation).toBeNull()
    })
  })
})
