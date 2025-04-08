import { describe, beforeEach, afterEach, test, expect, vi } from 'vitest'
import { Request, Response, NextFunction } from 'express'
import { ReservationController } from '@controllers/reservationController.js'
import { ReservationRequest } from '@book-library-tool/sdk'
import { randomUUID } from 'crypto'

describe('ReservationController', () => {
  let reservationController: ReservationController
  let mockReservationService: any
  let req: Partial<Request>
  let res: Partial<Response>
  let next: NextFunction

  beforeEach(() => {
    // Create a fake ReservationService with stubbed methods.
    mockReservationService = {
      createReservation: vi.fn(),
      getReservationHistory: vi.fn(),
      returnReservation: vi.fn(),
    }

    // Initialize the controller with the fake service.
    reservationController = new ReservationController(mockReservationService)

    // Setup basic Express mocks.
    req = {}
    res = { status: vi.fn().mockReturnThis(), json: vi.fn() }
    next = vi.fn()
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('createReservation', () => {
    test('should call next with error if createReservation throws (e.g., referenced book not found)', async () => {
      const userId = randomUUID()
      const reservationRequest: ReservationRequest = {
        userId: userId,
        isbn: 'ref123',
      }
      req.body = reservationRequest
      const error = new Error('Referenced book not found.')
      vi.mocked(mockReservationService.createReservation).mockRejectedValue(
        error,
      )

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

    test('should create a new reservation and return 201 for valid input', async () => {
      const userId = randomUUID()
      const reservationId = randomUUID()
      const reservationRequest: ReservationRequest = {
        userId: userId,
        isbn: 'ref123',
      }

      req.body = reservationRequest

      const now = new Date()
      const dueDate = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000)

      const createdReservation = {
        reservationId: reservationId,
        userId: userId,
        isbn: reservationRequest.isbn,
        status: 'reserved',
        reservedAt: now.toISOString(),
        dueDate: dueDate.toISOString(),
        feeCharged: 3,
      }

      vi.mocked(mockReservationService.createReservation).mockResolvedValue(
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
    })
  })

  describe('getReservationHistory', () => {
    test('should return 404 if service throws (e.g., user not found)', async () => {
      const userId = randomUUID()
      req.params = { userId }
      const error = new Error('User not found.')
      vi.mocked(mockReservationService.getReservationHistory).mockRejectedValue(
        error,
      )

      await reservationController.getReservationHistory(
        req as Request,
        res as Response,
        next,
      )

      expect(mockReservationService.getReservationHistory).toHaveBeenCalledWith(
        userId,
      )
      expect(next).toHaveBeenCalledWith(error)
      expect(res.status).not.toHaveBeenCalled()
    })

    test('should return reservation history with 200 for a valid userId', async () => {
      const userId = randomUUID()
      req.params = { userId }

      const fakeHistory = [
        {
          reservationId: randomUUID(),
          userId,
          isbn: 'ref123',
          status: 'reserved',
          reservedAt: new Date().toISOString(),
          dueDate: new Date().toISOString(),
          feeCharged: 3,
        },
        {
          reservationId: randomUUID(),
          userId,
          isbn: 'ref456',
          status: 'returned',
          reservedAt: new Date().toISOString(),
          dueDate: new Date().toISOString(),
          feeCharged: 3,
        },
      ]

      vi.mocked(mockReservationService.getReservationHistory).mockResolvedValue(
        fakeHistory,
      )

      await reservationController.getReservationHistory(
        req as Request,
        res as Response,
        next,
      )

      expect(mockReservationService.getReservationHistory).toHaveBeenCalledWith(
        userId,
      )
      expect(res.status).toHaveBeenCalledWith(200)
      expect(res.json).toHaveBeenCalledWith(fakeHistory)
    })
  })

  describe('returnReservation', () => {
    test('should process a reservation return and return 200 for valid input', async () => {
      const reservationId = randomUUID()
      req.params = { reservationId }
      req.body = { retailPrice: 10 }

      const result = {
        message: 'Reservation marked as returned',
        late_fee_applied: '0.2',
        days_late: 1,
      }

      vi.mocked(mockReservationService.returnReservation).mockResolvedValue(
        result,
      )

      await reservationController.returnReservation(
        req as Request,
        res as Response,
        next,
      )

      expect(mockReservationService.returnReservation).toHaveBeenCalledWith(
        reservationId,
      )
      expect(res.status).toHaveBeenCalledWith(200)
      expect(res.json).toHaveBeenCalledWith(result)
    })

    test('should call next with error if exception occurs in returnReservation', async () => {
      const reservationId = randomUUID()
      req.params = { reservationId }

      const error = new Error('Test error')

      vi.mocked(mockReservationService.returnReservation).mockRejectedValue(
        error,
      )

      await reservationController.returnReservation(
        req as Request,
        res as Response,
        next,
      )

      expect(next).toHaveBeenCalledWith(error)
      expect(res.status).not.toHaveBeenCalled()
    })
  })
})
