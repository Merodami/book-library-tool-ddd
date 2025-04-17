import { schemas } from '@book-library-tool/api'
import { DomainEvent } from '@book-library-tool/event-store'
import { RESERVATION_STATUS } from '@book-library-tool/types'
import { describe, expect, it, vi } from 'vitest'

import { Reservation } from '../../../../domain/entities/Reservation.js'
import { IReservationRepository } from '../../../../domain/repositories/IReservationRepository.js'

describe('IReservationRepository', () => {
  const mockRepository = {
    saveEvents: vi.fn(),
    appendBatch: vi.fn(),
    getEventsForAggregate: vi.fn(),
    createReservation: vi.fn(),
    returnReservation: vi.fn(),
    cancelReservation: vi.fn(),
    findById: vi.fn(),
    findActiveByUserAndIsbn: vi.fn(),
  } as unknown as IReservationRepository

  const mockUserId = 'user-123'
  const mockIsbn = '978-3-16-148410-0'
  const mockReservationId = 'reservation-123'
  const mockEvents: DomainEvent[] = [
    {
      eventType: 'ReservationCreated',
      aggregateId: mockReservationId,
      version: 1,
      schemaVersion: 1,
      timestamp: new Date(),
      payload: {},
    },
  ]

  describe('saveEvents', () => {
    it('should save events for an aggregate', async () => {
      await mockRepository.saveEvents(mockReservationId, mockEvents, 0)
      expect(mockRepository.saveEvents).toHaveBeenCalledWith(
        mockReservationId,
        mockEvents,
        0,
      )
    })
  })

  describe('appendBatch', () => {
    it('should append a batch of events', async () => {
      await mockRepository.appendBatch(mockReservationId, mockEvents, 0)
      expect(mockRepository.appendBatch).toHaveBeenCalledWith(
        mockReservationId,
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
      const events =
        await mockRepository.getEventsForAggregate(mockReservationId)
      expect(events).toEqual(mockEvents)
      expect(mockRepository.getEventsForAggregate).toHaveBeenCalledWith(
        mockReservationId,
      )
    })
  })

  describe('createReservation', () => {
    it('should create a new reservation', async () => {
      const { reservation: mockReservation } = Reservation.create({
        userId: mockUserId,
        isbn: mockIsbn,
      })

      vi.mocked(mockRepository.createReservation).mockResolvedValue(
        mockReservation,
      )
      const reservation = await mockRepository.createReservation({
        userId: mockUserId,
        isbn: mockIsbn,
      } as schemas.ReservationRequest)

      expect(reservation).toBeInstanceOf(Reservation)
      expect(mockRepository.createReservation).toHaveBeenCalledWith({
        userId: mockUserId,
        isbn: mockIsbn,
      })
    })
  })

  describe('returnReservation', () => {
    it('should mark a reservation as returned', async () => {
      const { reservation: mockReservation } = Reservation.create({
        userId: mockUserId,
        isbn: mockIsbn,
      })

      // Manually set the status to RETURNED for the test
      mockReservation.status = RESERVATION_STATUS.RETURNED

      vi.mocked(mockRepository.returnReservation).mockResolvedValue(
        mockReservation,
      )
      const reservation =
        await mockRepository.returnReservation(mockReservationId)

      expect(reservation.status).toBe(RESERVATION_STATUS.RETURNED)
      expect(mockRepository.returnReservation).toHaveBeenCalledWith(
        mockReservationId,
      )
    })
  })

  describe('cancelReservation', () => {
    it('should cancel a reservation', async () => {
      const { reservation: mockReservation } = Reservation.create({
        userId: mockUserId,
        isbn: mockIsbn,
      })

      // Manually set the status to CANCELLED for the test
      mockReservation.status = RESERVATION_STATUS.CANCELLED

      vi.mocked(mockRepository.cancelReservation).mockResolvedValue(
        mockReservation,
      )
      const reservation = await mockRepository.cancelReservation(
        mockReservationId,
        'User requested cancellation',
      )

      expect(reservation.status).toBe(RESERVATION_STATUS.CANCELLED)
      expect(mockRepository.cancelReservation).toHaveBeenCalledWith(
        mockReservationId,
        'User requested cancellation',
      )
    })
  })

  describe('findById', () => {
    it('should find a reservation by ID', async () => {
      const { reservation: mockReservation } = Reservation.create({
        userId: mockUserId,
        isbn: mockIsbn,
      })

      vi.mocked(mockRepository.findById).mockResolvedValue(mockReservation)
      const reservation = await mockRepository.findById(mockReservationId)

      expect(reservation).toBeInstanceOf(Reservation)
      expect(mockRepository.findById).toHaveBeenCalledWith(mockReservationId)
    })

    it('should return null when reservation is not found', async () => {
      vi.mocked(mockRepository.findById).mockResolvedValue(null)
      const reservation = await mockRepository.findById('non-existent-id')
      expect(reservation).toBeNull()
    })
  })

  describe('findActiveByUserAndIsbn', () => {
    it('should find an active reservation by user and ISBN', async () => {
      const { reservation: mockReservation } = Reservation.create({
        userId: mockUserId,
        isbn: mockIsbn,
      })

      // Manually set the status to RESERVED for the test
      mockReservation.status = RESERVATION_STATUS.RESERVED

      vi.mocked(mockRepository.findActiveByUserAndIsbn).mockResolvedValue(
        mockReservation,
      )
      const reservation = await mockRepository.findActiveByUserAndIsbn(
        mockUserId,
        mockIsbn,
      )

      expect(reservation).toBeInstanceOf(Reservation)
      expect(mockRepository.findActiveByUserAndIsbn).toHaveBeenCalledWith(
        mockUserId,
        mockIsbn,
      )
    })

    it('should return null when no active reservation is found', async () => {
      vi.mocked(mockRepository.findActiveByUserAndIsbn).mockResolvedValue(null)
      const reservation = await mockRepository.findActiveByUserAndIsbn(
        mockUserId,
        mockIsbn,
      )
      expect(reservation).toBeNull()
    })
  })
})
