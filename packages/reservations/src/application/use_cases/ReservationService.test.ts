import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { RESERVATION_STATUS } from '@book-library-tool/types'
import { randomUUID } from 'crypto'

// Create mocks
vi.mock('@book-library-tool/sdk', () => {
  return {
    apiWallet: {
      default: {
        postWalletsBalance: vi.fn().mockResolvedValue({
          /* mock response */
        }),
        patchWalletsLateReturn: vi.fn().mockResolvedValue({
          /* mock response */
        }),
      },
    },
    apiBooks: {
      default: {
        getBooks: vi.fn().mockResolvedValue({
          isbn: '1234567890',
          title: 'The Great Adventure',
          author: 'John Doe',
          publicationYear: 2023,
          publisher: 'Publisher Inc.',
          price: 10,
        }),
      },
    },
  }
})

// Import after mocking
import { apiWallet, apiBooks, ReservationRequest } from '@book-library-tool/sdk'
import { ReservationService } from './ReservationService.js'

// Create a fake repository
const fakeReservationRepository = {
  create: vi.fn(),
  findByUserId: vi.fn(),
  findById: vi.fn(),
  updateStatus: vi.fn(),
}

describe('ReservationService', () => {
  let reservationService: ReservationService
  let originalDateNow: () => number

  // Set up environment variables for testing.
  const BOOK_RETURN_DUE_DATE_DAYS = '5'
  const BOOK_RESERVATION_FEE = '3'
  const LATE_FEE_PER_DAY = '0.2'
  const OLD_ENV = process.env

  // Create valid UUIDs for tests
  const validUserId = randomUUID()
  const validReservationId = randomUUID()

  beforeEach(() => {
    // Save original Date.now
    originalDateNow = Date.now

    // Reset environment variables.
    process.env = { ...OLD_ENV }
    process.env.BOOK_RETURN_DUE_DATE_DAYS = BOOK_RETURN_DUE_DATE_DAYS
    process.env.BOOK_RESERVATION_FEE = BOOK_RESERVATION_FEE
    process.env.LATE_FEE_PER_DAY = LATE_FEE_PER_DAY

    // Reset all mocks.
    vi.resetAllMocks()

    // Setup default mock responses
    vi.mocked(apiWallet.default.postWalletsBalance).mockResolvedValue({
      userId: validUserId,
      balance: 97,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })

    vi.mocked(apiWallet.default.patchWalletsLateReturn).mockResolvedValue({
      message: 'Late fee applied',
      wallet: {
        userId: validUserId,
        balance: 97,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    })

    vi.mocked(apiBooks.default.getBooks).mockResolvedValue({
      isbn: '1234567890',
      title: 'The Great Adventure',
      author: 'John Doe',
      publicationYear: 2023,
      publisher: 'Publisher Inc.',
      price: 10,
    })

    // Create the service with our fake repository
    reservationService = new ReservationService(
      fakeReservationRepository as any,
    )
  })

  afterEach(() => {
    process.env = OLD_ENV
    Date.now = originalDateNow
  })

  describe('createReservation', () => {
    it('should create a new reservation and deduct reservation fee from wallet', async () => {
      // Arrange: Create a fake input DTO.
      const input: ReservationRequest = { userId: validUserId, isbn: 'isbn-1' }

      fakeReservationRepository.create.mockResolvedValue(undefined)

      // Act: Call createReservation
      const result = await reservationService.createReservation(input)

      // Assert
      expect(fakeReservationRepository.create).toHaveBeenCalled()
      expect(apiWallet.default.postWalletsBalance).toHaveBeenCalledWith({
        userId: input.userId,
        requestBody: { amount: -Number(BOOK_RESERVATION_FEE) },
      })

      // Check the result has the required fields
      expect(result).toHaveProperty('reservationId')
      expect(result).toHaveProperty('dueDate')
      expect(result).toHaveProperty('feeCharged')
      expect(result.userId).toBe(validUserId)
      expect(result.isbn).toBe(input.isbn)
      expect(result.status).toBe(RESERVATION_STATUS.RESERVED)
    })
  })

  describe('getReservationHistory', () => {
    it('should return reservation history for a given user', async () => {
      const userId = validUserId

      // Create mock data that will be returned by repository
      const mockData = [
        {
          reservationId: randomUUID(),
          userId: userId,
          isbn: 'isbn-1',
          reservedAt: new Date().toISOString(),
          dueDate: new Date().toISOString(),
          status: RESERVATION_STATUS.RESERVED,
          feeCharged: 3,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          reservationId: randomUUID(),
          userId: userId,
          isbn: 'isbn-2',
          reservedAt: new Date().toISOString(),
          dueDate: new Date().toISOString(),
          status: RESERVATION_STATUS.RETURNED,
          feeCharged: 3,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ]

      fakeReservationRepository.findByUserId.mockResolvedValue(mockData)

      const result = await reservationService.getReservationHistory(userId)

      expect(fakeReservationRepository.findByUserId).toHaveBeenCalledWith(
        userId,
      )

      expect(result.length).toBe(2)
      // Verify the result has the expected structure
      expect(result[0]).toHaveProperty('userId', userId)
      expect(result[1]).toHaveProperty('userId', userId)
    })
  })

  describe('returnReservation', () => {
    it('should process return with late fee and update status accordingly', async () => {
      // Instead of trying to mock Date.now, let's directly mock the implementation
      // of the comparison in the ReservationService

      // Define our mock data with a clear late return scenario
      const reservationId = validReservationId
      const now = new Date()
      const pastDueDate = new Date(now.getTime() - 24 * 60 * 60 * 1000) // 1 day ago

      // Create mock data with dates as strings (as they would be from a database)
      const mockData = {
        reservationId: reservationId,
        userId: validUserId,
        isbn: 'isbn-1',
        reservedAt: new Date(
          now.getTime() - 7 * 24 * 60 * 60 * 1000,
        ).toISOString(),
        dueDate: pastDueDate.toISOString(),
        status: RESERVATION_STATUS.RESERVED,
        feeCharged: 3,
        createdAt: new Date(
          now.getTime() - 7 * 24 * 60 * 60 * 1000,
        ).toISOString(),
        updatedAt: new Date(
          now.getTime() - 7 * 24 * 60 * 60 * 1000,
        ).toISOString(),

        // Add helper methods to make this mock behave like a real object
        // that would be returned after parsing from JSON
        getTime: () => pastDueDate.getTime(),
      }

      // Make the findById return an object that will register as "late"
      // by ensuring dueDate < now for the comparison in ReservationService
      fakeReservationRepository.findById.mockImplementation(() => {
        return {
          ...mockData,
          // Make dueDate a proper Date object that compares correctly
          dueDate: pastDueDate,
        }
      })

      // Prepare other mocks
      fakeReservationRepository.updateStatus.mockResolvedValue({
        modifiedCount: 1,
      })

      // Mock apiBooks to return consistent price
      vi.mocked(apiBooks.default.getBooks).mockResolvedValue({
        isbn: '1234567890',
        title: 'The Great Adventure',
        author: 'John Doe',
        publicationYear: 2023,
        publisher: 'Publisher Inc.',
        price: 10,
      })

      // Create a specific spy for patchWalletsLateReturn
      const patchWalletSpy = vi.fn().mockResolvedValue({
        message: 'Late fee applied',
        wallet: {
          userId: validUserId,
          balance: 97 - 0.2, // Deduct late fee
          createdAt: now.toISOString(),
          updatedAt: now.toISOString(),
        },
      })

      // Replace the mock implementation
      vi.mocked(apiWallet.default.patchWalletsLateReturn).mockImplementation(
        patchWalletSpy,
      )

      // Execute the method under test
      const result = await reservationService.returnReservation(reservationId)

      // Check the wallet API was called
      expect(patchWalletSpy).toHaveBeenCalled()
      expect(patchWalletSpy).toHaveBeenCalledWith({
        userId: validUserId,
        requestBody: { daysLate: 1, retailPrice: 10 },
      })

      // Verify status was updated
      expect(fakeReservationRepository.updateStatus).toHaveBeenCalledWith(
        reservationId,
        RESERVATION_STATUS.RETURNED,
      )

      // Verify result contains expected data
      expect(result.message).toContain(RESERVATION_STATUS.RETURNED)
      expect(result.days_late).toBe(1)
      expect(result.late_fee_applied).toBe('0.2')
    })

    it('should mark reservation as bought when late fee meets or exceeds retail price', async () => {
      // Define our mock data for a very late return (>10 days)
      const reservationId = validReservationId
      const now = new Date()
      const pastDueDate = new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000) // 20 days ago

      // Set high late fee
      process.env.LATE_FEE_PER_DAY = '1'

      // Create mock data
      const mockData = {
        reservationId: reservationId,
        userId: validUserId,
        isbn: 'isbn-1',
        reservedAt: new Date(
          now.getTime() - 30 * 24 * 60 * 60 * 1000,
        ).toISOString(),
        dueDate: pastDueDate.toISOString(),
        status: RESERVATION_STATUS.RESERVED,
        feeCharged: 3,
        createdAt: new Date(
          now.getTime() - 30 * 24 * 60 * 60 * 1000,
        ).toISOString(),
        updatedAt: new Date(
          now.getTime() - 30 * 24 * 60 * 60 * 1000,
        ).toISOString(),

        // Add helper methods
        getTime: () => pastDueDate.getTime(),
      }

      // Make findById return an object that triggers "bought" status
      fakeReservationRepository.findById.mockImplementation(() => {
        return {
          ...mockData,
          dueDate: pastDueDate,
        }
      })

      // Set low book price to ensure fee exceeds price
      vi.mocked(apiBooks.default.getBooks).mockResolvedValue({
        isbn: '1234567890',
        title: 'The Great Adventure',
        author: 'John Doe',
        publicationYear: 2023,
        publisher: 'Publisher Inc.',
        price: 5,
      })

      // Create specific spy
      const patchWalletSpy = vi.fn().mockResolvedValue({
        message: 'Late fee applied',
        wallet: {
          userId: validUserId,
          balance: 77,
          createdAt: now.toISOString(),
          updatedAt: now.toISOString(),
        },
      })

      // Set up mocks
      fakeReservationRepository.updateStatus.mockResolvedValue({
        modifiedCount: 1,
      })
      vi.mocked(apiWallet.default.patchWalletsLateReturn).mockImplementation(
        patchWalletSpy,
      )

      // Execute test
      const result = await reservationService.returnReservation(reservationId)

      // Check the wallet API was called
      expect(patchWalletSpy).toHaveBeenCalled()
      expect(patchWalletSpy).toHaveBeenCalledWith({
        userId: validUserId,
        requestBody: { daysLate: 20, retailPrice: 5 },
      })

      // Verify BOUGHT status
      expect(fakeReservationRepository.updateStatus).toHaveBeenCalledWith(
        reservationId,
        RESERVATION_STATUS.BOUGHT,
      )

      // Verify result values
      expect(result.message).toContain(RESERVATION_STATUS.BOUGHT)
      expect(result.days_late).toBe(20)
      expect(parseFloat(result.late_fee_applied)).toBeGreaterThanOrEqual(5)
    })

    it('should throw an error if no active reservation is found', async () => {
      const reservationId = 'non-existent'
      fakeReservationRepository.findById.mockResolvedValue(null)

      await expect(
        reservationService.returnReservation(reservationId),
      ).rejects.toThrow('Active reservation not found.')
    })
  })
})
