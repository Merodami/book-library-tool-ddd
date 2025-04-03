import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { walletHandler } from './walletHandler.js'
import { DatabaseService } from '@book-library-tool/database'

const dummyUpdateResult = {
  acknowledged: true,
  matchedCount: 1,
  modifiedCount: 1,
  upsertedCount: 0,
  upsertedId: null,
}

describe('walletHandler', () => {
  let req: any, res: any, next: any
  let walletCollection: any

  beforeEach(() => {
    // Create a fake wallet collection with mocked functions.
    walletCollection = {
      findOne: vi.fn(),
      updateOne: vi.fn(),
    }

    // Spy on DatabaseService.getCollection to always return our fake wallet collection.
    vi.spyOn(DatabaseService, 'getCollection').mockReturnValue(walletCollection)

    // Setup default mocks for req, res, and next.
    req = { params: {}, body: {} }
    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    }
    next = vi.fn()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('getWallet', () => {
    it('should return 404 if wallet is not found', async () => {
      req.params = { userId: '  user123  ' } // extra spaces to test trimming

      vi.spyOn(DatabaseService, 'findOne').mockResolvedValue(null)

      await walletHandler.getWallet(req, res, next)

      expect(DatabaseService.getCollection).toHaveBeenCalledWith('wallets')
      expect(DatabaseService.findOne).toHaveBeenCalledWith(walletCollection, {
        userId: 'user123',
      })
      expect(res.status).toHaveBeenCalledWith(404)
      expect(res.json).toHaveBeenCalledWith({ message: 'Wallet not found.' })
    })

    it('should return 200 and wallet data if wallet is found', async () => {
      req.params = { userId: 'user123' }

      const fakeWallet = {
        userId: 'user123',
        balance: 100,
        updatedAt: '2025-04-01T12:00:00.000Z',
      }

      vi.spyOn(DatabaseService, 'findOne').mockResolvedValue(fakeWallet as any)

      await walletHandler.getWallet(req, res, next)

      expect(res.status).toHaveBeenCalledWith(200)
      expect(res.json).toHaveBeenCalledWith(fakeWallet)
    })

    it('should call next with error when an exception occurs', async () => {
      const error = new Error('Test error')

      vi.spyOn(DatabaseService, 'findOne').mockRejectedValue(error)

      req.params = { userId: 'user123' }

      await walletHandler.getWallet(req, res, next)

      expect(next).toHaveBeenCalledWith(error)
    })
  })

  describe('updateWalletBalance', () => {
    it('should update wallet balance and return the updated wallet', async () => {
      req.params = { userId: 'user123' }
      req.body = { amount: 50 }

      const updatedWallet = {
        userId: 'user123',
        balance: 150,
        updatedAt: '2025-04-01T13:00:00.000Z',
      }

      // Stub updateDocument to resolve successfully.
      vi.spyOn(DatabaseService, 'updateDocument').mockResolvedValue(
        dummyUpdateResult,
      )

      // Stub walletCollection.findOne to return updated wallet.
      walletCollection.findOne.mockResolvedValue(updatedWallet)

      await walletHandler.updateWalletBalance(req, res, next)

      expect(DatabaseService.updateDocument).toHaveBeenCalledWith(
        walletCollection,
        { userId: 'user123' },
        { $inc: { balance: 50 } },
        { upsert: true },
      )
      expect(walletCollection.findOne).toHaveBeenCalledWith(
        { userId: 'user123' },
        { projection: { _id: 0, updatedAt: 0, createdAt: 0 } },
      )
      expect(res.status).toHaveBeenCalledWith(200)
      expect(res.json).toHaveBeenCalledWith(updatedWallet)
    })

    it('should call next with error when an exception occurs during balance update', async () => {
      const error = new Error('Update error')

      req.params = { userId: 'user123' }
      req.body = { amount: 50 }

      vi.spyOn(DatabaseService, 'updateDocument').mockRejectedValue(error)

      await walletHandler.updateWalletBalance(req, res, next)

      expect(next).toHaveBeenCalledWith(error)
    })
  })

  describe('lateReturn', () => {
    const originalLateFee = process.env.LATE_FEE_PER_DAY

    beforeEach(() => {
      process.env.LATE_FEE_PER_DAY = '2' // For testing, set fee per day = 2.
    })

    afterEach(() => {
      process.env.LATE_FEE_PER_DAY = originalLateFee
    })

    it('should apply late fee and return "Late fee applied." when fee is less than retailPrice', async () => {
      req.params = { userId: 'user123' }
      req.body = { daysLate: 3, retailPrice: 10 } // fee = 3*2 = 6 (< 10)

      const fakeWallet = {
        userId: 'user123',
        balance: 94,
        updatedAt: '2025-04-01T14:00:00.000Z',
      }

      vi.spyOn(DatabaseService, 'updateDocument').mockResolvedValue(
        dummyUpdateResult,
      )
      vi.spyOn(DatabaseService, 'findOne').mockResolvedValue(fakeWallet as any)

      await walletHandler.lateReturn(req, res, next)

      expect(DatabaseService.updateDocument).toHaveBeenCalledWith(
        walletCollection,
        { userId: 'user123' },
        { $inc: { balance: -6 } },
        { upsert: true },
      )
      expect(res.status).toHaveBeenCalledWith(200)
      expect(res.json).toHaveBeenCalledWith({
        message: 'Late fee applied.',
        wallet: fakeWallet,
      })
    })

    it('should apply late fee and return bought message when fee is greater than or equal to retailPrice', async () => {
      req.params = { userId: 'user123' }
      req.body = { daysLate: 6, retailPrice: 10 } // fee = 6*2 = 12 (>= 10)

      const fakeWallet = {
        userId: 'user123',
        balance: 88,
        updatedAt: '2025-04-01T15:00:00.000Z',
      }

      vi.spyOn(DatabaseService, 'updateDocument').mockResolvedValue(
        dummyUpdateResult,
      )
      vi.spyOn(DatabaseService, 'findOne').mockResolvedValue(fakeWallet as any)
      await walletHandler.lateReturn(req, res, next)

      expect(DatabaseService.updateDocument).toHaveBeenCalledWith(
        walletCollection,
        { userId: 'user123' },
        { $inc: { balance: -12 } },
        { upsert: true },
      )
      expect(res.status).toHaveBeenCalledWith(200)
      expect(res.json).toHaveBeenCalledWith({
        message:
          'Late fees have reached or exceeded the retail price; the book is considered bought.',
        wallet: fakeWallet,
      })
    })

    it('should call next with error when an exception occurs during late fee application', async () => {
      const error = new Error('Late fee error')

      req.params = { userId: 'user123' }
      req.body = { daysLate: 3, retailPrice: 10 }

      vi.spyOn(DatabaseService, 'updateDocument').mockRejectedValue(error)

      await walletHandler.lateReturn(req, res, next)

      expect(next).toHaveBeenCalledWith(error)
    })
  })
})
