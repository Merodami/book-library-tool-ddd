import {
  PaginatedResult,
  Reservation as SDKReservation,
} from '@book-library-tool/sdk'
import { RESERVATION_STATUS } from '@book-library-tool/types'
import { Reservation } from '@reservations/entities/Reservation.js'
import { IReservationProjectionRepository } from '@reservations/repositories/IReservationProjectionRepository.js'
import { describe, expect, it, vi } from 'vitest'

describe('IReservationProjectionRepository', () => {
  const mockRepository = {
    getUserReservations: vi.fn(),
    getReservationById: vi.fn(),
    getBookReservations: vi.fn(),
    getActiveBookReservations: vi.fn(),
    getReservationsByStatus: vi.fn(),
    countActiveReservationsByUser: vi.fn(),
  } as unknown as IReservationProjectionRepository

  const mockUserId = 'user-123'
  const mockBookId = '5a123456-7890-1234-5678-901234567890'
  const mockId = '9b9b9b9b-9b9b-9b9b-9b9b-9b9b9b9b9b9b'
  const { reservation: mockReservation } = Reservation.create({
    userId: mockUserId,
    bookId: mockBookId,
  })

  const mockSDKReservation: SDKReservation = {
    id: mockReservation.id,
    userId: mockReservation.userId,
    bookId: mockReservation.bookId,
    reservedAt: mockReservation.reservedAt.toISOString(),
    dueDate: mockReservation.dueDate.toISOString(),
    status: 'created',
    feeCharged: mockReservation.feeCharged,
    retailPrice: mockReservation.retailPrice || undefined,
    createdAt: mockReservation.createdAt.toISOString(),
    updatedAt: mockReservation.updatedAt.toISOString(),
  }

  const mockPaginatedResult: PaginatedResult = {
    data: [mockSDKReservation],
    pagination: {
      total: 1,
      page: 1,
      limit: 10,
      pages: 1,
      hasNext: false,
      hasPrev: false,
    },
  }

  describe('getUserReservations', () => {
    it('should get all reservations for a user', async () => {
      vi.mocked(mockRepository.getUserReservations).mockResolvedValue(
        mockPaginatedResult,
      )

      const result = await mockRepository.getUserReservations({
        userId: mockUserId,
      })

      expect(result.data).toHaveLength(1)
      expect(result.data[0]).toEqual(mockSDKReservation)
      expect(mockRepository.getUserReservations).toHaveBeenCalledWith({
        userId: mockUserId,
      })
    })
  })

  describe('getReservationById', () => {
    it('should get a reservation by ID', async () => {
      vi.mocked(mockRepository.getReservationById).mockResolvedValue(
        mockSDKReservation,
      )

      const reservation = await mockRepository.getReservationById(mockId)

      expect(reservation).toEqual(mockSDKReservation)
      expect(mockRepository.getReservationById).toHaveBeenCalledWith(mockId)
    })

    it('should return null when reservation is not found', async () => {
      vi.mocked(mockRepository.getReservationById).mockResolvedValue(null)

      const reservation =
        await mockRepository.getReservationById('non-existent-id')

      expect(reservation).toBeNull()
    })
  })

  describe('getBookReservations', () => {
    it('should get all reservations for a book', async () => {
      vi.mocked(mockRepository.getBookReservations).mockResolvedValue(
        mockPaginatedResult,
      )

      const result = await mockRepository.getBookReservations(mockBookId)

      expect(result.data).toHaveLength(1)
      expect(result.data[0]).toEqual(mockSDKReservation)
      expect(mockRepository.getBookReservations).toHaveBeenCalledWith(
        mockBookId,
      )
    })
  })

  describe('getActiveBookReservations', () => {
    it('should get active reservations for a book', async () => {
      vi.mocked(mockRepository.getActiveBookReservations).mockResolvedValue([
        mockSDKReservation,
      ])

      const reservations =
        await mockRepository.getActiveBookReservations(mockBookId)

      expect(reservations).toHaveLength(1)
      expect(reservations[0]).toEqual(mockSDKReservation)
      expect(mockRepository.getActiveBookReservations).toHaveBeenCalledWith(
        mockBookId,
      )
    })
  })

  describe('getReservationsByStatus', () => {
    it('should get reservations by status', async () => {
      vi.mocked(mockRepository.getReservationsByStatus).mockResolvedValue(
        mockPaginatedResult,
      )

      const result = await mockRepository.getReservationsByStatus(
        RESERVATION_STATUS.CREATED,
      )

      expect(result.data).toHaveLength(1)
      expect(result.data[0]).toEqual(mockSDKReservation)
      expect(mockRepository.getReservationsByStatus).toHaveBeenCalledWith(
        RESERVATION_STATUS.CREATED,
      )
    })
  })

  describe('countActiveReservationsByUser', () => {
    it('should count active reservations for a user', async () => {
      vi.mocked(mockRepository.countActiveReservationsByUser).mockResolvedValue(
        1,
      )

      const count =
        await mockRepository.countActiveReservationsByUser(mockUserId)

      expect(count).toBe(1)
      expect(mockRepository.countActiveReservationsByUser).toHaveBeenCalledWith(
        mockUserId,
      )
    })
  })
})
