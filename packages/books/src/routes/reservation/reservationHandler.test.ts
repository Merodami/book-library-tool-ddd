import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { reservationHandler } from './reservationHandler.js'
import { DatabaseService } from '@book-library-tool/database'
import { paginationHelper } from '@book-library-tool/database'
import { apiWallet } from '@book-library-tool/sdk'
import { ReservationStatus } from '@book-library-tool/types'
import { ObjectId } from 'mongodb'

describe('reservationHandler', () => {
  let req: any, res: any, next: any
  let fakeBooksCollection: any,
    fakeUsersCollection: any,
    fakeReservationsCollection: any,
    fakeGetPaginatedData: any

  beforeEach(() => {
    // Create fake collections with stubbed functions.
    fakeBooksCollection = {
      findOne: vi.fn(),
    }
    fakeUsersCollection = {
      findOne: vi.fn(),
    }
    fakeReservationsCollection = {
      findOne: vi.fn(),
      insertOne: vi.fn(),
      find: vi.fn().mockReturnValue({
        sort: vi.fn().mockReturnThis(),
        toArray: vi.fn(),
      }),
    }
    fakeGetPaginatedData = vi.spyOn(paginationHelper, 'getPaginatedData')

    // Stub DatabaseService.getCollection to return our fake collections based on name.
    vi.spyOn(DatabaseService, 'getCollection').mockImplementation(
      (collectionName: string) => {
        if (collectionName === 'books') return fakeBooksCollection
        if (collectionName === 'users') return fakeUsersCollection
        if (collectionName === 'reservations') return fakeReservationsCollection
      },
    )

    // Reset request, response, next mocks.
    req = { params: {}, body: {}, pagination: { page: 1, limit: 10 } }
    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    }
    next = vi.fn()

    // Set default environment variables.
    process.env.BOOK_RETURN_DUE_DATE_DAYS = '5'
    process.env.BOOK_RESERVATION_FEE = '3'
    process.env.LATE_FEE_PER_DAY = '0.2'
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('createReservation', () => {
    it('should return 404 if referenced book is not found', async () => {
      req.body = {
        userId: '7a120e5a-5e3b-4b34-b15d-e136b6a377cf',
        referenceId: 'ref123',
      }
      fakeBooksCollection.findOne.mockResolvedValue(null)

      await reservationHandler.createReservation(req, res, next)

      expect(res.status).toHaveBeenCalledWith(404)
      expect(res.json).toHaveBeenCalledWith({
        message: 'Referenced book not found.',
      })
    })

    it('should return 404 if user is not found', async () => {
      req.body = {
        userId: '7a120e5a-5e3b-4b34-b15d-e136b6a377cf',
        referenceId: 'ref123',
      }
      // Simulate referenced book exists.
      fakeBooksCollection.findOne.mockResolvedValue({ id: 'ref123' })
      // Simulate user not found.
      fakeUsersCollection.findOne.mockResolvedValue(null)

      await reservationHandler.createReservation(req, res, next)

      expect(res.status).toHaveBeenCalledWith(404)
      expect(res.json).toHaveBeenCalledWith({ message: 'User not found.' })
    })

    it('should return 400 if user wallet balance is insufficient', async () => {
      req.body = {
        userId: '7a120e5a-5e3b-4b34-b15d-e136b6a377cf',
        referenceId: 'ref123',
      }
      fakeBooksCollection.findOne.mockResolvedValue({ id: 'ref123' })
      fakeUsersCollection.findOne.mockResolvedValue({
        userId: '7a120e5a-5e3b-4b34-b15d-e136b6a377cf',
      })
      // Simulate wallet balance less than fee.
      vi.spyOn(apiWallet.default, 'getWallets').mockResolvedValue({
        userId: '7a120e5a-5e3b-4b34-b15d-e136b6a377cf',
        balance: 2,
      })

      await reservationHandler.createReservation(req, res, next)

      expect(res.status).toHaveBeenCalledWith(400)
      expect(res.json).toHaveBeenCalledWith({
        message: 'User does not have enough balance to reserve a book.',
      })
    })

    it('should return 400 if user has 3 or more active reservations', async () => {
      req.body = {
        userId: '7a120e5a-5e3b-4b34-b15d-e136b6a377cf',
        referenceId: 'ref123',
      }
      fakeBooksCollection.findOne.mockResolvedValue({ id: 'ref123' })
      fakeUsersCollection.findOne.mockResolvedValue({
        userId: '7a120e5a-5e3b-4b34-b15d-e136b6a377cf',
      })

      vi.spyOn(apiWallet.default, 'getWallets').mockResolvedValue({
        userId: '7a120e5a-5e3b-4b34-b15d-e136b6a377cf',
        balance: 10,
      })
      // Simulate active reservations count for user is 3.
      vi.spyOn(DatabaseService, 'countDocuments').mockResolvedValue(3)

      await reservationHandler.createReservation(req, res, next)

      expect(res.status).toHaveBeenCalledWith(400)
      expect(res.json).toHaveBeenCalledWith({
        message: 'User cannot borrow more than 3 books at the same time.',
      })
    })

    it('should return 400 if user already has an active reservation for the same book', async () => {
      req.body = {
        userId: '7a120e5a-5e3b-4b34-b15d-e136b6a377cf',
        referenceId: 'ref123',
      }
      // For the referenced book:
      fakeBooksCollection.findOne.mockResolvedValueOnce({
        id: 'ref123',
        price: 10,
      })
      // For the user:
      fakeUsersCollection.findOne.mockResolvedValueOnce({
        userId: '7a120e5a-5e3b-4b34-b15d-e136b6a377cf',
      })

      // For the wallet: (add this mock to ensure a valid wallet is returned)
      vi.spyOn(apiWallet.default, 'getWallets').mockResolvedValueOnce({
        userId: '7a120e5a-5e3b-4b34-b15d-e136b6a377cf',
        balance: 10,
      })

      // For the active reservation check:
      fakeReservationsCollection.findOne.mockResolvedValueOnce({
        reservationId: '46416cf9-7156-4967-8990-9c15b0830ae5',
        _id: new ObjectId(),
      })

      // Simulate active reservations count is 1.
      vi.spyOn(DatabaseService, 'countDocuments').mockResolvedValueOnce(1)

      await reservationHandler.createReservation(req, res, next)

      expect(res.status).toHaveBeenCalledWith(400)
      expect(res.json).toHaveBeenCalledWith({
        message:
          'User already has an active reservation for this book reference.',
      })
    })

    it('should return 400 if no copies are available for this book reference', async () => {
      req.body = {
        userId: '7a120e5a-5e3b-4b34-b15d-e136b6a377cf',
        referenceId: 'ref123',
      }
      fakeBooksCollection.findOne.mockResolvedValue({ id: 'ref123' })
      fakeUsersCollection.findOne.mockResolvedValue({
        userId: '7a120e5a-5e3b-4b34-b15d-e136b6a377cf',
      })
      vi.spyOn(apiWallet.default, 'getWallets').mockResolvedValue({
        userId: '7a120e5a-5e3b-4b34-b15d-e136b6a377cf',
        balance: 10,
      })

      // For the user active count, return 0.
      vi.spyOn(DatabaseService, 'countDocuments').mockImplementation(
        (col, filter) => {
          if (col === fakeReservationsCollection) {
            // When checking copies available.
            if (filter.referenceId) return Promise.resolve(4)
            return Promise.resolve(1)
          }
          return Promise.resolve(0)
        },
      )

      await reservationHandler.createReservation(req, res, next)

      expect(res.status).toHaveBeenCalledWith(400)
      expect(res.json).toHaveBeenCalledWith({
        message: 'No copies available for this book reference.',
      })
    })

    it('should create a reservation and return 201', async () => {
      req.body = {
        userId: '7a120e5a-5e3b-4b34-b15d-e136b6a377cf',
        referenceId: 'ref123',
      }
      // For the referenced book:
      fakeBooksCollection.findOne.mockResolvedValueOnce({
        id: 'ref123',
        price: 10,
      })
      // For the user:
      fakeUsersCollection.findOne.mockResolvedValueOnce({
        userId: '7a120e5a-5e3b-4b34-b15d-e136b6a377cf',
      })
      // For the wallet, mock getWallets to return sufficient balance.
      vi.spyOn(apiWallet.default, 'getWallets').mockResolvedValueOnce({
        userId: '7a120e5a-5e3b-4b34-b15d-e136b6a377cf',
        balance: 10,
      })

      // For the active reservation check (none exists):
      fakeReservationsCollection.findOne.mockResolvedValueOnce(null)

      // Simulate active count is 0.
      vi.spyOn(DatabaseService, 'countDocuments')
        .mockResolvedValueOnce(0)
        // For available copies checks
        .mockResolvedValueOnce(0)

      // Stub apiWallet.postWalletsBalance:
      vi.spyOn(apiWallet.default, 'postWalletsBalance').mockResolvedValue({
        userId: '7a120e5a-5e3b-4b34-b15d-e136b6a377cf',
        balance: 2,
      })
      // Stub insertDocument to return a dummy result.
      vi.spyOn(DatabaseService, 'insertDocument').mockResolvedValue({
        acknowledged: true,
        insertedId: new ObjectId(),
      })

      const beforeTime = new Date()

      await reservationHandler.createReservation(req, res, next)

      expect(apiWallet.default.postWalletsBalance).toHaveBeenCalledWith({
        userId: '7a120e5a-5e3b-4b34-b15d-e136b6a377cf',
        requestBody: { amount: -3 },
      })
      expect(DatabaseService.insertDocument).toHaveBeenCalled()
      expect(res.status).toHaveBeenCalledWith(201)
      // Optionally, inspect the inserted reservation for required properties:
      const insertedReservation = (DatabaseService.insertDocument as any).mock
        .calls[0][1]
      expect(insertedReservation).toHaveProperty('reservationId')
      expect(insertedReservation).toHaveProperty('reservedAt')
      // And validate timestamps are set.
      const createdAt = new Date(insertedReservation.reservedAt)
      expect(createdAt.getTime()).toBeGreaterThanOrEqual(beforeTime.getTime())
    })
  })

  describe('getReservationHistory', () => {
    it('should return 404 if user is not found', async () => {
      req.params = { userId: '7a120e5a-5e3b-4b34-b15d-e136b6a377cf' }
      fakeUsersCollection.findOne.mockResolvedValue(null)

      await reservationHandler.getReservationHistory(req, res, next)

      expect(res.status).toHaveBeenCalledWith(404)
      expect(res.json).toHaveBeenCalledWith({ message: 'User not found.' })
    })

    it('should return reservation history with 200', async () => {
      const userId = '7a120e5a-5e3b-4b34-b15d-e136b6a377cf'

      req.params = { userId }

      fakeUsersCollection.findOne.mockResolvedValue({
        userId,
      })

      const fakeHistory = [
        { reservationId: 'res1', reservedAt: '2025-04-01T10:00:00.000Z' },
        { reservationId: 'res2', reservedAt: '2025-04-01T09:00:00.000Z' },
      ]

      // Mock the getPaginatedData method
      fakeGetPaginatedData.mockResolvedValue(fakeHistory)

      await reservationHandler.getReservationHistory(req, res, next)

      // Verify if call to getPaginatedData was made with expected parameters
      expect(fakeGetPaginatedData).toHaveBeenCalledWith(
        fakeReservationsCollection,
        { userId },
        req,
        { projection: { _id: 0 }, sort: { reservedAt: -1 } },
      )
      expect(res.status).toHaveBeenCalledWith(200)
      expect(res.json).toHaveBeenCalledWith(fakeHistory)
    })
  })

  describe('returnReservation', () => {
    it('should return 400 if no reservationId is provided', async () => {
      req.params = {}

      await reservationHandler.returnReservation(req, res, next)

      expect(res.status).toHaveBeenCalledWith(400)
      expect(res.json).toHaveBeenCalledWith({
        message: 'Reservation ID is required.',
      })
    })

    it('should return 404 if active reservation is not found', async () => {
      req.params = { reservationId: '46416cf9-7156-4967-8990-9c15b0830ae5' }
      fakeReservationsCollection.findOne.mockResolvedValue(null)

      await reservationHandler.returnReservation(req, res, next)

      expect(res.status).toHaveBeenCalledWith(404)
      expect(res.json).toHaveBeenCalledWith({
        message: 'Active reservation not found.',
      })
    })

    it('should process return with no late fee when returned on time', async () => {
      const now = new Date()
      // Reservation with due date in the future.
      const reservation = {
        reservationId: '46416cf9-7156-4967-8990-9c15b0830ae5',
        userId: '7a120e5a-5e3b-4b34-b15d-e136b6a377cf',
        referenceId: 'ref123',
        dueDate: new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString(), // due tomorrow
        reservedAt: now.toISOString(),
        status: 'reserved',
        feeCharged: 3,
      }

      req.params = { reservationId: '46416cf9-7156-4967-8990-9c15b0830ae5' }

      fakeReservationsCollection.findOne.mockResolvedValue(reservation)

      vi.spyOn(DatabaseService, 'updateDocument').mockResolvedValue({
        acknowledged: true,
        matchedCount: 1,
        modifiedCount: 1,
        upsertedCount: 0,
        upsertedId: null,
      })

      await reservationHandler.returnReservation(req, res, next)

      expect(DatabaseService.updateDocument).toHaveBeenCalledWith(
        fakeReservationsCollection,
        { reservationId: '46416cf9-7156-4967-8990-9c15b0830ae5' },
        { status: ReservationStatus.RETURNED },
      )
      expect(res.status).toHaveBeenCalledWith(200)
      expect(res.json).toHaveBeenCalledWith({
        message: `Reservation marked as ${ReservationStatus.RETURNED}.`,
        late_fee_applied: '0.0',
        days_late: 0,
      })
    })

    it('should process return with late fee and update wallet when returned late', async () => {
      const now = new Date()
      // Reservation with due date in the past.
      const reservation = {
        reservationId: '46416cf9-7156-4967-8990-9c15b0830ae5',
        userId: '7a120e5a-5e3b-4b34-b15d-e136b6a377cf',
        referenceId: 'ref123',
        dueDate: new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString(), // due yesterday
        reservedAt: new Date(now.getTime() - 48 * 60 * 60 * 1000).toISOString(),
        status: 'reserved',
        feeCharged: 3,
      }

      req.params = { reservationId: '46416cf9-7156-4967-8990-9c15b0830ae5' }

      fakeReservationsCollection.findOne.mockResolvedValue(reservation)
      // For a late return, simulate referenced book exists with a retail price.
      fakeBooksCollection.findOne.mockResolvedValue({ id: 'ref123', price: 10 })

      vi.spyOn(apiWallet.default, 'patchWalletsLateReturn').mockResolvedValue(
        {},
      )

      vi.spyOn(DatabaseService, 'updateDocument').mockResolvedValue({
        acknowledged: true,
        matchedCount: 1,
        modifiedCount: 1,
        upsertedCount: 0,
        upsertedId: null,
      })

      await reservationHandler.returnReservation(req, res, next)

      // For 1 day late, fee = 1 * 0.2 = 0.2, which is less than retailPrice.
      expect(apiWallet.default.patchWalletsLateReturn).toHaveBeenCalledWith({
        userId: '7a120e5a-5e3b-4b34-b15d-e136b6a377cf',
        requestBody: { daysLate: 1, retailPrice: 10 },
      })
      expect(DatabaseService.updateDocument).toHaveBeenCalledWith(
        fakeReservationsCollection,
        { reservationId: '46416cf9-7156-4967-8990-9c15b0830ae5' },
        { status: ReservationStatus.RETURNED },
      )
      expect(res.status).toHaveBeenCalledWith(200)
      expect(res.json).toHaveBeenCalledWith({
        message: `Reservation marked as ${ReservationStatus.RETURNED}.`,
        late_fee_applied: '0.2',
        days_late: 1,
      })
    })

    it('should mark reservation as bought when late fee >= retailPrice', async () => {
      const now = new Date()
      // Reservation with due date sufficiently in the past.
      const reservation = {
        reservationId: '46416cf9-7156-4967-8990-9c15b0830ae5',
        userId: '7a120e5a-5e3b-4b34-b15d-e136b6a377cf',
        referenceId: 'ref123',
        dueDate: new Date(now.getTime() - 48 * 60 * 60 * 1000).toISOString(), // due 2 days ago
        reservedAt: new Date(now.getTime() - 72 * 60 * 60 * 1000).toISOString(),
        status: 'reserved',
        feeCharged: 3,
      }
      req.params = { reservationId: '46416cf9-7156-4967-8990-9c15b0830ae5' }
      fakeReservationsCollection.findOne.mockResolvedValue(reservation)
      fakeBooksCollection.findOne.mockResolvedValue({ id: 'ref123', price: 10 })

      vi.spyOn(apiWallet.default, 'patchWalletsLateReturn').mockResolvedValue(
        {},
      )
      vi.spyOn(DatabaseService, 'updateDocument').mockResolvedValue({
        acknowledged: true,
        matchedCount: 1,
        modifiedCount: 1,
        upsertedCount: 0,
        upsertedId: null,
      })

      // Adjust LATE_FEE_PER_DAY so that fee becomes >= retailPrice.
      process.env.LATE_FEE_PER_DAY = '10' // fee = daysLate (2) * 10 = 20

      await reservationHandler.returnReservation(req, res, next)

      expect(DatabaseService.updateDocument).toHaveBeenCalledWith(
        fakeReservationsCollection,
        { reservationId: '46416cf9-7156-4967-8990-9c15b0830ae5' },
        { status: ReservationStatus.BOUGHT },
      )
      expect(res.status).toHaveBeenCalledWith(200)
      expect(res.json).toHaveBeenCalledWith({
        message: `Reservation marked as ${ReservationStatus.BOUGHT}.`,
        late_fee_applied: expect.any(String),
        days_late: expect.any(Number),
      })
    })

    it('should call next with error when an exception occurs in returnReservation', async () => {
      const error = new Error('Return error')

      req.params = { reservationId: '46416cf9-7156-4967-8990-9c15b0830ae5' }

      fakeReservationsCollection.findOne.mockRejectedValue(error)

      await reservationHandler.returnReservation(req, res, next)

      expect(next).toHaveBeenCalledWith(error)
    })
  })
})
