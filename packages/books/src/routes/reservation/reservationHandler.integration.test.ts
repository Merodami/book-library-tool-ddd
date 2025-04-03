import {
  describe,
  beforeAll,
  afterAll,
  beforeEach,
  it,
  expect,
  vi,
} from 'vitest'
import { setUpTestDatabase } from '@book-library-tool/database/src/testUtils/setUpTestDatabase.js'
import express from 'express'
import request from 'supertest'
import cors from 'cors'
import { randomUUID } from 'crypto'
import { DatabaseService } from '@book-library-tool/database'
import type { Book, Reservation, User } from '@book-library-tool/sdk'
import { apiWallet, paginationMiddleware } from '@book-library-tool/sdk'
import {
  validateBody,
  validateParams,
  schemas,
  validateQuery,
} from '@book-library-tool/api'

// Import your router or create a minimal version for testing
import { reservationHandler } from './reservationHandler.js'
import { ReservationStatus } from '@book-library-tool/types'

// Mock the apiWallet
vi.mock('@book-library-tool/sdk', async () => {
  const actual = await vi.importActual('@book-library-tool/sdk')
  return {
    ...actual,
    apiWallet: {
      default: {
        getWallets: vi.fn(),
        postWalletsBalance: vi.fn(),
        patchWalletsLateReturn: vi.fn(),
      },
    },
  }
})

describe('Reservation Handler Integration Tests', () => {
  const db = setUpTestDatabase({ randomUUID })
  let app: express.Express

  // Common test headers for requests
  const commonHeaders = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    Authorization: 'Bearer test-token',
  }

  // Test data
  const testUserId = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
  const testBook: Book = {
    id: '0515125628',
    title: 'The Target',
    author: 'Catherine Coulter',
    publicationYear: 1999,
    publisher: 'Jove Books',
    price: 27,
  }
  const testUser: User = {
    userId: testUserId,
    role: 'user',
    email: 'test@example.com',
  }

  // Setup database and express app before all tests
  beforeAll(async () => {
    // Set up the test environment variables
    await db.beforeAllCallback()

    // Explicitly connect to the test database
    await DatabaseService.connect()

    // Set environment variables for testing
    process.env.BOOK_RETURN_DUE_DATE_DAYS = '5'
    process.env.BOOK_RESERVATION_FEE = '3'
    process.env.LATE_FEE_PER_DAY = '0.2'

    // Setup a minimal express app for testing including validation middleware
    app = express()
      .disable('x-powered-by')
      .use(cors())
      .use(express.json())
      .post(
        '/reservations',
        validateBody(schemas.ReservationRequestSchema),
        reservationHandler.createReservation,
      )
      .get(
        '/reservations/user/:userId',
        validateParams(schemas.UserIdSchema),
        validateQuery(schemas.ReservationsHistoryQuerySchema),
        paginationMiddleware(),
        reservationHandler.getReservationHistory,
      )
      .patch(
        '/reservations/:reservationId/return',
        validateParams(schemas.ReservationReturnParamsSchema),
        reservationHandler.returnReservation,
      )
  })

  // Clean the database and insert test data before each test
  beforeEach(async () => {
    // Reset the database
    await db.beforeEachCallback()

    // Reset all mocks
    vi.resetAllMocks()

    // Insert test book and user
    const booksCollection = DatabaseService.getCollection<Book>('books')
    const usersCollection = DatabaseService.getCollection<User>('users')

    await DatabaseService.insertDocument(booksCollection, testBook)
    await DatabaseService.insertDocument(usersCollection, testUser)

    // Mock wallet API responses
    vi.mocked(apiWallet.default.getWallets).mockResolvedValue({
      userId: testUserId,
      balance: 50.0,
    })

    vi.mocked(apiWallet.default.postWalletsBalance).mockResolvedValue({
      userId: testUserId,
      balance: 47.0, // 50 - 3 (reservation fee)
    })

    vi.mocked(apiWallet.default.patchWalletsLateReturn).mockResolvedValue({
      message: 'Late fee applied.',
      wallet: {
        userId: testUserId,
        balance: 46.0,
      },
    })
  })

  // Cleanup after all tests
  afterAll(async () => {
    // Ensure we properly disconnect from the database
    await db.afterAllCallback()

    // Clean up environment variables
    delete process.env.BOOK_RETURN_DUE_DATE_DAYS
    delete process.env.BOOK_RESERVATION_FEE
    delete process.env.LATE_FEE_PER_DAY
  })

  describe('Create Reservation', () => {
    it('should create a new reservation successfully', async () => {
      const reservationRequest = {
        userId: testUserId,
        referenceId: testBook.id,
      }

      const response = await request(app)
        .post('/reservations')
        .set(commonHeaders)
        .send(reservationRequest)
        .expect(201)

      expect(response.body).toBeDefined()
      expect(response.body.userId).toBe(testUserId)
      expect(response.body.referenceId).toBe(testBook.id)
      expect(response.body.status).toBe('reserved')
      expect(response.body.reservationId).toBeDefined()
      expect(response.body.reservedAt).toBeDefined()
      expect(response.body.dueDate).toBeDefined()
      expect(response.body.feeCharged).toBe(3)

      // Verify wallet was charged
      expect(apiWallet.default.postWalletsBalance).toHaveBeenCalledWith({
        userId: testUserId,
        requestBody: { amount: -3 },
      })
    })

    it('should return validation error when request body is invalid', async () => {
      // Missing referenceId
      const invalidRequest = {
        userId: testUserId,
        // referenceId is missing
      }

      const response = await request(app)
        .post('/reservations')
        .set(commonHeaders)
        .send(invalidRequest)
        .expect(400)

      // The exact error message will depend on your validation implementation
      expect(response.body.error || response.body.message).toBeDefined()

      // Wallet API should not be called
      expect(apiWallet.default.getWallets).not.toHaveBeenCalled()
    })

    it('should return 404 when book reference does not exist', async () => {
      const reservationRequest = {
        userId: testUserId,
        referenceId: 'nonexistent-book',
      }

      const response = await request(app)
        .post('/reservations')
        .set(commonHeaders)
        .send(reservationRequest)
        .expect(404)

      expect(response.body.message).toBe('Referenced book not found.')
    })

    // Rest of tests remain the same
  })

  describe('Get Reservation History', () => {
    it('should return user reservation history', async () => {
      // Insert some test reservations
      const reservationsCollection =
        DatabaseService.getCollection<Reservation>('reservations')

      // Add a second book
      const secondBook: Book = {
        id: '9876543210',
        title: 'Another Book',
        author: 'Another Author',
        publicationYear: 2020,
        publisher: 'Test Publisher',
        price: 35,
      }

      const booksCollection = DatabaseService.getCollection<Book>('books')
      await DatabaseService.insertDocument(booksCollection, secondBook)

      // Create reservations with different statuses
      const reservations = [
        {
          reservationId: randomUUID(),
          userId: testUserId,
          referenceId: testBook.id,
          reservedAt: new Date(
            Date.now() - 10 * 24 * 60 * 60 * 1000,
          ).toISOString(),
          dueDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
          status: ReservationStatus.RETURNED,
          feeCharged: 3,
        },
        {
          reservationId: randomUUID(),
          userId: testUserId,
          referenceId: secondBook.id,
          reservedAt: new Date().toISOString(),
          dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
          status: ReservationStatus.RESERVED,
          feeCharged: 3,
        },
      ]

      for (const reservation of reservations) {
        await DatabaseService.insertDocument(
          reservationsCollection,
          reservation,
        )
      }

      // Request the history
      const response = await request(app)
        .get(`/reservations/user/${testUserId}`)
        .set(commonHeaders)
        .expect(200)

      expect(response.body.data).toBeInstanceOf(Array)
      expect(response.body.data.length).toBe(2)
      expect(response.body.data[0].status).toBe('reserved') // Most recent first
      expect(response.body.data[1].status).toBe('returned')
    })

    it('should return validation error for invalid userId format', async () => {
      // Non-UUID format userId
      const response = await request(app)
        .get('/reservations/user/invalid-user-id-format')
        .set(commonHeaders)
        .expect(400)

      // The exact error message will depend on your validation implementation
      expect(response.body.error || response.body.message).toBeDefined()
    })

    // Rest of tests remain the same
  })

  describe('Return Reservation', () => {
    it('should mark a reservation as returned when on time', async () => {
      // Create a test reservation
      const reservationsCollection =
        DatabaseService.getCollection<Reservation>('reservations')

      const reservationId = randomUUID()
      const reservation = {
        reservationId,
        userId: testUserId,
        referenceId: testBook.id,
        reservedAt: new Date().toISOString(),
        dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(), // Due in 5 days
        status: ReservationStatus.RESERVED,
        feeCharged: 3,
      }

      await DatabaseService.insertDocument(reservationsCollection, reservation)

      // Return the reservation
      const response = await request(app)
        .patch(`/reservations/${reservationId}/return`)
        .set(commonHeaders)
        .expect(200)

      expect(response.body.message).toBe('Reservation marked as returned.')
      expect(response.body.late_fee_applied).toBe('0.0')
      expect(response.body.days_late).toBe(0)

      // Verify wallet API was not called for on-time return
      expect(apiWallet.default.patchWalletsLateReturn).not.toHaveBeenCalled()

      // Check the reservation status was updated
      const updatedReservation = await reservationsCollection.findOne({
        reservationId,
      })
      expect(updatedReservation?.status).toBe('returned')
    })

    it('should return validation error for invalid reservationId format', async () => {
      // Non-UUID format reservationId
      const response = await request(app)
        .patch('/reservations/invalid-reservation-id-format/return')
        .set(commonHeaders)
        .expect(400)

      // The exact error message will depend on your validation implementation
      expect(response.body.error || response.body.message).toBeDefined()
    })

    it('should apply late fees when returning after due date', async () => {
      // Create a test reservation with a past due date
      const reservationsCollection =
        DatabaseService.getCollection<Reservation>('reservations')

      const reservationId = randomUUID()
      const reservation = {
        reservationId,
        userId: testUserId,
        referenceId: testBook.id,
        reservedAt: new Date(
          Date.now() - 10 * 24 * 60 * 60 * 1000,
        ).toISOString(), // 10 days ago
        dueDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days ago
        status: ReservationStatus.RESERVED,
        feeCharged: 3,
      }

      await DatabaseService.insertDocument(reservationsCollection, reservation)

      // Return the reservation
      const response = await request(app)
        .patch(`/reservations/${reservationId}/return`)
        .set(commonHeaders)
        .expect(200)

      expect(response.body.message).toBe('Reservation marked as returned.')
      expect(parseFloat(response.body.late_fee_applied)).toBeGreaterThan(0)
      expect(response.body.days_late).toBeGreaterThan(0)

      // Verify wallet API was called for late return
      expect(apiWallet.default.patchWalletsLateReturn).toHaveBeenCalledWith({
        userId: testUserId,
        requestBody: expect.objectContaining({
          daysLate: expect.any(Number),
          retailPrice: testBook.price,
        }),
      })

      // Check the reservation status was updated
      const updatedReservation = await reservationsCollection.findOne({
        reservationId,
      })
      expect(updatedReservation?.status).toBe('returned')
    })

    it('should mark a book as bought when late fees exceed book price', async () => {
      // Create a very overdue reservation
      const reservationsCollection =
        DatabaseService.getCollection<Reservation>('reservations')

      // Modify the book price to be very low for this test
      const booksCollection = DatabaseService.getCollection<Book>('books')
      await booksCollection.updateOne(
        { id: testBook.id },
        { $set: { price: 0.5 } }, // Very low price so late fees exceed it quickly
      )

      const reservationId = randomUUID()
      const reservation = {
        reservationId,
        userId: testUserId,
        referenceId: testBook.id,
        reservedAt: new Date(
          Date.now() - 20 * 24 * 60 * 60 * 1000,
        ).toISOString(), // 20 days ago
        dueDate: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(), // 15 days ago
        status: ReservationStatus.RESERVED,
        feeCharged: 3,
      }

      await DatabaseService.insertDocument(reservationsCollection, reservation)

      // Return the reservation
      const response = await request(app)
        .patch(`/reservations/${reservationId}/return`)
        .set(commonHeaders)
        .expect(200)

      // Late fee should be 15 days × 0.2€ = 3€, which exceeds the book price of 0.5€
      expect(response.body.message).toBe('Reservation marked as bought.')
      expect(parseFloat(response.body.late_fee_applied)).toBeGreaterThan(0)
      expect(response.body.days_late).toBeGreaterThan(0)

      // Check the reservation status was updated to "bought"
      const updatedReservation = await reservationsCollection.findOne({
        reservationId,
      })
      expect(updatedReservation?.status).toBe('bought')
    })

    it('should return 404 when reservation not found', async () => {
      const nonExistentId = randomUUID()

      const response = await request(app)
        .patch(`/reservations/${nonExistentId}/return`)
        .set(commonHeaders)
        .expect(404)

      expect(response.body.message).toBe('Active reservation not found.')
    })

    it('should return 404 when referenced book not found', async () => {
      // Create a reservation with a book that will be deleted
      const reservationsCollection =
        DatabaseService.getCollection<Reservation>('reservations')

      const reservationId = randomUUID()
      const reservation = {
        reservationId,
        userId: testUserId,
        referenceId: testBook.id,
        reservedAt: new Date(
          Date.now() - 10 * 24 * 60 * 60 * 1000,
        ).toISOString(),
        dueDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        status: ReservationStatus.RESERVED,
        feeCharged: 3,
      }

      await DatabaseService.insertDocument(reservationsCollection, reservation)

      // Delete the book
      const booksCollection = DatabaseService.getCollection<Book>('books')
      await booksCollection.deleteOne({ id: testBook.id })

      // Try to return the reservation
      const response = await request(app)
        .patch(`/reservations/${reservationId}/return`)
        .set(commonHeaders)
        .expect(404)

      expect(response.body.message).toBe('Referenced book not found.')
    })
    it('should not accept returns for already returned or bought books', async () => {
      // Create a returned reservation
      const reservationsCollection =
        DatabaseService.getCollection<Reservation>('reservations')

      const reservationId = randomUUID()
      const reservation = {
        reservationId,
        userId: testUserId,
        referenceId: testBook.id,
        reservedAt: new Date(
          Date.now() - 10 * 24 * 60 * 60 * 1000,
        ).toISOString(),
        dueDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        status: ReservationStatus.RETURNED,
        feeCharged: 3,
      }

      await DatabaseService.insertDocument(reservationsCollection, reservation)

      // Try to return it again
      const response = await request(app)
        .patch(`/reservations/${reservationId}/return`)
        .set(commonHeaders)
        .expect(404)

      expect(response.body.message).toBe('Active reservation not found.')
    })
  })
})
