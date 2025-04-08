import { describe, beforeEach, afterEach, test, expect, vi } from 'vitest'
import { Request, Response, NextFunction } from 'express'
import { ReservationController } from '@controllers/reservationController.js'
import { RESERVATION_STATUS } from '@book-library-tool/types'
import { randomUUID } from 'crypto'
import { Errors } from '@book-library-tool/shared'

describe('ReservationController', () => {
  let reservationController: ReservationController
  let mockReservationService: any
  let req: Partial<Request>
  let res: Partial<Response>
  let next: NextFunction
  let validUserId: string
  let validReservationId: string

  beforeEach(() => {
    // Generate valid UUIDs for testing
    validUserId = randomUUID()
    validReservationId = randomUUID()

    // Create mocks for ReservationService methods.
    mockReservationService = {
      createReservation: vi.fn(),
      getReservationHistory: vi.fn(),
      returnReservation: vi.fn(),
    }

    // Initialize the controller with the mock service.
    reservationController = new ReservationController(mockReservationService)

    // Set up basic Express mocks.
    req = {}
    res = { status: vi.fn().mockReturnThis(), json: vi.fn() }
    next = vi.fn()
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('createReservation', () => {
    test('should create a new reservation and return 201 for valid input', async () => {
      const reservationRequest = {
        userId: validUserId,
        isbn: 'ref123',
      }

      req.body = reservationRequest

      // Create a mock reservation with all required fields
      const now = new Date()
      const dueDate = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000)

      const createdReservation = {
        reservationId: validReservationId,
        userId: validUserId,
        isbn: reservationRequest.isbn,
        reservedAt: now.toISOString(),
        dueDate: dueDate.toISOString(),
        status: RESERVATION_STATUS.RESERVED,
        feeCharged: 3,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      }

      mockReservationService.createReservation.mockResolvedValue(
        createdReservation,
      )

      await reservationController.createReservation(
        req as Request,
        res as Response,
        next,
      )

      expect(mockReservationService.createReservation).toHaveBeenCalledWith(
        reservationRequest,
      )
      expect(res.status).toHaveBeenCalledWith(201)
      expect(res.json).toHaveBeenCalledWith(createdReservation)
      expect(next).not.toHaveBeenCalled()
    })

    test('should call next with error if createReservation throws', async () => {
      const reservationRequest = {
        userId: validUserId,
        isbn: 'ref123',
      }
      req.body = reservationRequest

      const error = new Error('Referenced book not found.')

      mockReservationService.createReservation.mockRejectedValue(error)

      await reservationController.createReservation(
        req as Request,
        res as Response,
        next,
      )

      expect(mockReservationService.createReservation).toHaveBeenCalledWith(
        reservationRequest,
      )
      expect(next).toHaveBeenCalledWith(error)
      expect(res.status).not.toHaveBeenCalled()
      expect(res.json).not.toHaveBeenCalled()
    })

    test('should handle when userId is missing in request', async () => {
      const invalidRequest = {
        isbn: 'ref123',
        // Missing userId
      }
      req.body = invalidRequest

      const error = new Errors.ApplicationError(
        400,
        'VALIDATION_ERROR',
        'userId is required',
      )

      mockReservationService.createReservation.mockRejectedValue(error)

      await reservationController.createReservation(
        req as Request,
        res as Response,
        next,
      )

      expect(mockReservationService.createReservation).toHaveBeenCalledWith(
        invalidRequest,
      )
      expect(next).toHaveBeenCalledWith(error)
      expect(res.status).not.toHaveBeenCalled()
    })

    test('should handle when ISBN is missing in request', async () => {
      const invalidRequest = {
        userId: validUserId,
        // Missing isbn
      }
      req.body = invalidRequest

      const error = new Errors.ApplicationError(
        400,
        'VALIDATION_ERROR',
        'isbn is required',
      )

      mockReservationService.createReservation.mockRejectedValue(error)

      await reservationController.createReservation(
        req as Request,
        res as Response,
        next,
      )

      expect(mockReservationService.createReservation).toHaveBeenCalledWith(
        invalidRequest,
      )
      expect(next).toHaveBeenCalledWith(error)
      expect(res.status).not.toHaveBeenCalled()
    })

    test('should handle when book is already reserved', async () => {
      const reservationRequest = {
        userId: validUserId,
        isbn: 'ref123',
      }
      req.body = reservationRequest

      const error = new Errors.ApplicationError(
        409,
        'BOOK_ALREADY_RESERVED',
        'The requested book is already reserved by another user',
      )

      mockReservationService.createReservation.mockRejectedValue(error)

      await reservationController.createReservation(
        req as Request,
        res as Response,
        next,
      )

      expect(mockReservationService.createReservation).toHaveBeenCalledWith(
        reservationRequest,
      )
      expect(next).toHaveBeenCalledWith(error)
      expect(res.status).not.toHaveBeenCalled()
    })

    test('should handle when user has reached maximum reservations', async () => {
      const reservationRequest = {
        userId: validUserId,
        isbn: 'ref123',
      }
      req.body = reservationRequest

      const error = new Errors.ApplicationError(
        400,
        'MAX_RESERVATIONS_REACHED',
        'User has reached the maximum number of allowed reservations',
      )

      mockReservationService.createReservation.mockRejectedValue(error)

      await reservationController.createReservation(
        req as Request,
        res as Response,
        next,
      )

      expect(mockReservationService.createReservation).toHaveBeenCalledWith(
        reservationRequest,
      )
      expect(next).toHaveBeenCalledWith(error)
      expect(res.status).not.toHaveBeenCalled()
    })
  })

  describe('getReservationHistory', () => {
    test('should return reservation history with 200 for a valid userId', async () => {
      req.params = { userId: validUserId }

      const now = new Date()
      const dueDate = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000)

      const fakeHistory = [
        {
          reservationId: randomUUID(),
          userId: validUserId,
          isbn: 'isbn-1',
          reservedAt: now.toISOString(),
          dueDate: dueDate.toISOString(),
          status: RESERVATION_STATUS.RESERVED,
          feeCharged: 3,
          createdAt: now.toISOString(),
          updatedAt: now.toISOString(),
        },
        {
          reservationId: randomUUID(),
          userId: validUserId,
          isbn: 'isbn-2',
          reservedAt: now.toISOString(),
          dueDate: dueDate.toISOString(),
          status: RESERVATION_STATUS.RETURNED,
          feeCharged: 3,
          createdAt: now.toISOString(),
          updatedAt: now.toISOString(),
        },
      ]

      mockReservationService.getReservationHistory.mockResolvedValue(
        fakeHistory,
      )

      await reservationController.getReservationHistory(
        req as Request,
        res as Response,
        next,
      )

      expect(mockReservationService.getReservationHistory).toHaveBeenCalledWith(
        validUserId,
      )
      expect(res.status).toHaveBeenCalledWith(200)
      expect(res.json).toHaveBeenCalledWith(fakeHistory)
      expect(next).not.toHaveBeenCalled()
    })

    test('should return empty array when user has no reservations', async () => {
      req.params = { userId: validUserId }

      mockReservationService.getReservationHistory.mockResolvedValue([])

      await reservationController.getReservationHistory(
        req as Request,
        res as Response,
        next,
      )

      expect(mockReservationService.getReservationHistory).toHaveBeenCalledWith(
        validUserId,
      )
      expect(res.status).toHaveBeenCalledWith(200)
      expect(res.json).toHaveBeenCalledWith([])
      expect(next).not.toHaveBeenCalled()
    })

    test('should call next with error if service throws (e.g., user not found)', async () => {
      req.params = { userId: validUserId }
      const error = new Error('User not found.')
      mockReservationService.getReservationHistory.mockRejectedValue(error)

      await reservationController.getReservationHistory(
        req as Request,
        res as Response,
        next,
      )

      expect(mockReservationService.getReservationHistory).toHaveBeenCalledWith(
        validUserId,
      )
      expect(next).toHaveBeenCalledWith(error)
      expect(res.status).not.toHaveBeenCalled()
      expect(res.json).not.toHaveBeenCalled()
    })

    test('should handle invalid userId format', async () => {
      req.params = { userId: 'invalid-uuid-format' }

      const error = new Errors.ApplicationError(
        400,
        'VALIDATION_ERROR',
        'Invalid user ID format',
      )

      mockReservationService.getReservationHistory.mockRejectedValue(error)

      await reservationController.getReservationHistory(
        req as Request,
        res as Response,
        next,
      )

      expect(mockReservationService.getReservationHistory).toHaveBeenCalledWith(
        'invalid-uuid-format',
      )
      expect(next).toHaveBeenCalledWith(error)
      expect(res.status).not.toHaveBeenCalled()
    })

    test('should handle database connection errors', async () => {
      req.params = { userId: validUserId }

      const error = new Errors.ApplicationError(
        500,
        'DATABASE_ERROR',
        'Failed to connect to the database',
      )

      mockReservationService.getReservationHistory.mockRejectedValue(error)

      await reservationController.getReservationHistory(
        req as Request,
        res as Response,
        next,
      )

      expect(mockReservationService.getReservationHistory).toHaveBeenCalledWith(
        validUserId,
      )
      expect(next).toHaveBeenCalledWith(error)
      expect(res.status).not.toHaveBeenCalled()
    })
  })

  describe('returnReservation', () => {
    test('should process a reservation return and return 200 for valid input', async () => {
      req.params = { reservationId: validReservationId }

      const result = {
        message: 'Reservation marked as returned',
        late_fee_applied: '0.2',
        days_late: 1,
        status: RESERVATION_STATUS.RETURNED,
      }

      mockReservationService.returnReservation.mockResolvedValue(result)

      await reservationController.returnReservation(
        req as Request,
        res as Response,
        next,
      )

      expect(mockReservationService.returnReservation).toHaveBeenCalledWith(
        validReservationId,
      )
      expect(res.status).toHaveBeenCalledWith(200)
      expect(res.json).toHaveBeenCalledWith(result)
      expect(next).not.toHaveBeenCalled()
    })

    test('should process a reservation return with late fees', async () => {
      req.params = { reservationId: validReservationId }

      const result = {
        message: 'Reservation marked as returned with late fees',
        late_fee_applied: '5.0',
        days_late: 10,
        status: RESERVATION_STATUS.RETURNED,
      }

      mockReservationService.returnReservation.mockResolvedValue(result)

      await reservationController.returnReservation(
        req as Request,
        res as Response,
        next,
      )

      expect(mockReservationService.returnReservation).toHaveBeenCalledWith(
        validReservationId,
      )
      expect(res.status).toHaveBeenCalledWith(200)
      expect(res.json).toHaveBeenCalledWith(result)
    })

    test('should handle when reservation is not found', async () => {
      req.params = { reservationId: validReservationId }

      const error = new Errors.ApplicationError(
        404,
        'RESERVATION_NOT_FOUND',
        `Reservation with id ${validReservationId} not found`,
      )

      mockReservationService.returnReservation.mockRejectedValue(error)

      await reservationController.returnReservation(
        req as Request,
        res as Response,
        next,
      )

      expect(mockReservationService.returnReservation).toHaveBeenCalledWith(
        validReservationId,
      )
      expect(next).toHaveBeenCalledWith(error)
      expect(res.status).not.toHaveBeenCalled()
    })

    test('should handle when reservation is already returned', async () => {
      req.params = { reservationId: validReservationId }

      const error = new Errors.ApplicationError(
        400,
        'INVALID_RESERVATION_STATUS',
        'Reservation cannot be returned in its current status',
      )

      mockReservationService.returnReservation.mockRejectedValue(error)

      await reservationController.returnReservation(
        req as Request,
        res as Response,
        next,
      )

      expect(mockReservationService.returnReservation).toHaveBeenCalledWith(
        validReservationId,
      )
      expect(next).toHaveBeenCalledWith(error)
      expect(res.status).not.toHaveBeenCalled()
    })

    test('should handle invalid reservationId format', async () => {
      req.params = { reservationId: 'invalid-uuid-format' }

      const error = new Errors.ApplicationError(
        400,
        'VALIDATION_ERROR',
        'Invalid reservation ID format',
      )

      mockReservationService.returnReservation.mockRejectedValue(error)

      await reservationController.returnReservation(
        req as Request,
        res as Response,
        next,
      )

      expect(mockReservationService.returnReservation).toHaveBeenCalledWith(
        'invalid-uuid-format',
      )
      expect(next).toHaveBeenCalledWith(error)
      expect(res.status).not.toHaveBeenCalled()
    })

    test('should call next with error if exception occurs in returnReservation', async () => {
      req.params = { reservationId: validReservationId }

      const error = new Error('Test error')
      mockReservationService.returnReservation.mockRejectedValue(error)

      await reservationController.returnReservation(
        req as Request,
        res as Response,
        next,
      )

      expect(next).toHaveBeenCalledWith(error)
      expect(res.status).not.toHaveBeenCalled()
      expect(res.json).not.toHaveBeenCalled()
    })
  })
})
