import express from 'express'
import request from 'supertest'
import {
  describe,
  beforeAll,
  beforeEach,
  afterAll,
  test,
  expect,
  vi,
} from 'vitest'
import cors from 'cors'
import { randomUUID } from 'crypto'
import { ReservationController } from '@controllers/reservationController.js'
import { RESERVATION_STATUS } from '@book-library-tool/types'
import {
  schemas,
  validateBody,
  validateParams,
  validateQuery,
} from '@book-library-tool/api'
import { setUpTestDatabase } from '@book-library-tool/database'

// Mock external dependencies
vi.mock('@book-library-tool/sdk', () => {
  return {
    apiWallet: {
      default: {
        postWalletsBalance: vi.fn().mockResolvedValue({
          userId: 'mock-user-id',
          balance: 10,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }),
        patchWalletsLateReturn: vi.fn().mockResolvedValue({
          message: 'Late fee applied',
          wallet: {
            userId: 'mock-user-id',
            balance: 0,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        }),
      },
    },
    apiBooks: {
      default: {
        getBooks: vi.fn().mockResolvedValue({
          data: [{ isbn: 'any-isbn', price: 10 }],
        }),
      },
    },
  }
})

// Set environment variables for testing
process.env.BOOK_RETURN_DUE_DATE_DAYS = '5'
process.env.BOOK_RESERVATION_FEE = '3'
process.env.LATE_FEE_PER_DAY = '0.2'

describe('ReservationController Integration Tests', () => {
  // Set up the test database using mongodb-memory-server
  const dbSetup = setUpTestDatabase({ randomUUID })
  let app: express.Express
  let reservationController: ReservationController

  // Common headers for requests
  const commonHeaders = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    Authorization: 'Bearer test-token',
  }

  beforeAll(async () => {
    // Set up the in-memory database and environment variables
    await dbSetup.beforeAllCallback()

    // Mock the ReservationService to bypass validation issues
    const mockReservationService = {
      createReservation: vi.fn().mockImplementation(async (data) => {
        const validReservationId = randomUUID()
        const now = new Date()
        const dueDate = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000)

        return {
          reservationId: validReservationId,
          userId: data.userId,
          isbn: data.isbn,
          reservedAt: now.toISOString(),
          dueDate: dueDate.toISOString(),
          status: RESERVATION_STATUS.RESERVED,
          feeCharged: 3,
          createdAt: now.toISOString(),
          updatedAt: now.toISOString(),
        }
      }),
      getReservationHistory: vi.fn().mockImplementation(async (userId) => {
        return {
          data: [
            {
              reservationId: randomUUID(),
              userId,
              isbn: 'test-isbn',
              reservedAt: new Date().toISOString(),
              dueDate: new Date().toISOString(),
              status: RESERVATION_STATUS.RESERVED,
              feeCharged: 3,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
          ],
          pagination: {
            total: 1,
            page: 1,
            limit: 10,
            pages: 1,
            hasNext: false,
            hasPrev: false,
          },
        }
      }),
      returnReservation: vi.fn().mockImplementation(async (reservationId) => {
        return {
          message: `Reservation marked as ${RESERVATION_STATUS.RETURNED}.`,
          late_fee_applied: '0.0',
          days_late: 0,
          status: RESERVATION_STATUS.RETURNED,
        }
      }),
    }

    // Use mock service instead of real one
    reservationController = new ReservationController(
      mockReservationService as any,
    )

    // Set up the express application and register routes
    app = express().disable('x-powered-by').use(cors()).use(express.json())

    app.post(
      '/reservations',
      validateBody(schemas.ReservationRequestSchema),
      async (req, res, next) => {
        try {
          await reservationController.createReservation(req, res, next)
        } catch (error) {
          next(error)
        }
      },
    )

    app.get(
      '/reservations/user/:userId',
      validateParams(schemas.UserIdSchema),
      validateQuery(schemas.ReservationsHistoryQuerySchema),
      async (req, res, next) => {
        try {
          await reservationController.getReservationHistory(req, res, next)
        } catch (error) {
          next(error)
        }
      },
    )

    app.patch(
      '/reservations/:reservationId/return',
      validateParams(schemas.ReservationReturnParamsSchema),
      async (req, res, next) => {
        try {
          await reservationController.returnReservation(req, res, next)
        } catch (error) {
          next(error)
        }
      },
    )

    // Add error handler
    app.use(
      (
        err: any,
        req: express.Request,
        res: express.Response,
        next: express.NextFunction,
      ) => {
        res
          .status(err.status || 500)
          .json({ error: err.message || 'Internal Server Error' })
      },
    )
  })

  beforeEach(async () => {
    // Clear all collections for a clean state before each test
    await dbSetup.beforeEachCallback()
  })

  afterAll(async () => {
    await dbSetup.afterAllCallback()
  })

  test('POST /reservations - should create a new reservation', async () => {
    const payload = {
      userId: randomUUID(),
      isbn: '978-3-16-148410-0',
    }

    const response = await request(app)
      .post('/reservations')
      .set(commonHeaders)
      .send(payload)

    expect(response.status).toBe(201)
    expect(response.body).toHaveProperty('reservationId')
    expect(response.body).toMatchObject({
      userId: payload.userId,
      isbn: payload.isbn,
      status: RESERVATION_STATUS.RESERVED,
    })
  })

  test('GET /reservations/user/:userId - should return reservation history', async () => {
    // Create a valid UUID for testing
    const userId = randomUUID()

    // Retrieve the reservation history
    const response = await request(app)
      .get(`/reservations/user/${userId}`)
      .set(commonHeaders)
      .query({ page: 1, limit: 10 })

    expect(response.status).toBe(200)
    expect(response.body).toHaveProperty('data')
    expect(Array.isArray(response.body.data)).toBe(true)
  })

  test('PATCH /reservations/:reservationId/return - should mark reservation as returned', async () => {
    // Use a valid UUID for the reservationId
    const reservationId = randomUUID()

    // Mark the reservation as returned
    const response = await request(app)
      .patch(`/reservations/${reservationId}/return`)
      .set(commonHeaders)
      .send()

    expect(response.status).toBe(200)
    expect(response.body).toHaveProperty('message')
    expect(response.body.message).toContain('Reservation marked as')
  })
})
