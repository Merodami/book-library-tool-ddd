import { describe, beforeAll, afterAll, beforeEach, it, expect } from 'vitest'
import { setUpTestDatabase } from '@book-library-tool/database/src/testUtils/setUpTestDatabase.js'
import express from 'express'
import request from 'supertest'
import cors from 'cors'
import { randomUUID } from 'crypto'
import { DatabaseService } from '@book-library-tool/database'
import { validateBody, validateParams, schemas } from '@book-library-tool/api'

// Import the walletHandler
import { walletHandler } from './walletHandler.js'

describe('Wallet Handler Integration Tests', () => {
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
  const initialBalance = 100

  // Setup database and express app before all tests
  beforeAll(async () => {
    await db.beforeAllCallback()

    // Explicitly connect to the database
    await DatabaseService.connect()

    // Store the original environment variable
    const originalLateFee = process.env.LATE_FEE_PER_DAY

    // Set environment variables for testing
    process.env.LATE_FEE_PER_DAY = '0.2'

    // Setup a minimal express app for testing with validation middleware
    app = express()
      .disable('x-powered-by')
      .use(cors())
      .use(express.json())
      .get(
        '/wallets/:userId',
        validateParams(schemas.UserIdSchema),
        walletHandler.getWallet,
      )
      .post(
        '/wallets/:userId/balance',
        validateParams(schemas.UserIdSchema),
        validateBody(schemas.WalletBalanceRequestSchema),
        walletHandler.updateWalletBalance,
      )
      .patch(
        '/wallets/:userId/late-return',
        validateParams(schemas.UserIdSchema),
        validateBody(schemas.LateReturnRequestSchema),
        walletHandler.lateReturn,
      )

    // Clean up function for environment variables
    return () => {
      process.env.LATE_FEE_PER_DAY = originalLateFee
    }
  })

  // Clean the database and insert test data before each test
  beforeEach(async () => {
    // Reset the database
    await db.beforeEachCallback()

    // Create a test wallet for each test
    const walletsCollection = DatabaseService.getCollection('wallets')

    await DatabaseService.insertDocument(walletsCollection, {
      userId: testUserId,
      balance: initialBalance,
    })
  })

  // Cleanup after all tests
  afterAll(async () => {
    await db.afterAllCallback()
  })

  describe('Get Wallet', () => {
    it('should retrieve a wallet for a valid user ID', async () => {
      const response = await request(app)
        .get(`/wallets/${testUserId}`)
        .set(commonHeaders)
        .expect(200)

      expect(response.body).toBeDefined()
      expect(response.body.userId).toBe(testUserId)
      expect(response.body.balance).toBe(initialBalance)
    })

    it('should return validation error for invalid userId format', async () => {
      // Non-UUID format userId
      const response = await request(app)
        .get('/wallets/invalid-user-id')
        .set(commonHeaders)
        .expect(400)

      // The exact error message will depend on your validation implementation
      expect(response.body.error || response.body.message).toBeDefined()
    })

    it('should return 404 when wallet is not found', async () => {
      const nonExistentUserId = randomUUID()

      const response = await request(app)
        .get(`/wallets/${nonExistentUserId}`)
        .set(commonHeaders)
        .expect(404)

      expect(response.body.message).toBe('Wallet not found.')
    })

    it('should handle whitespace in user ID parameter', async () => {
      const response = await request(app)
        .get(`/wallets/  ${testUserId}  `) // Extra whitespace
        .set(commonHeaders)
        .expect(400)

      expect(response.body.userId).toBe(undefined)
    })
  })

  describe('Update Wallet Balance', () => {
    it('should add funds to a wallet', async () => {
      const amountToAdd = 50

      const response = await request(app)
        .post(`/wallets/${testUserId}/balance`)
        .set(commonHeaders)
        .send({ amount: amountToAdd })
        .expect(200)

      expect(response.body).toBeDefined()
      expect(response.body.userId).toBe(testUserId)
      expect(response.body.balance).toBe(initialBalance + amountToAdd)
    })

    it('should return validation error for invalid userId format', async () => {
      const response = await request(app)
        .post('/wallets/invalid-user-id/balance')
        .set(commonHeaders)
        .send({ amount: 50 })
        .expect(400)

      expect(response.body.error || response.body.message).toBeDefined()
    })

    it('should return validation error for missing amount', async () => {
      const response = await request(app)
        .post(`/wallets/${testUserId}/balance`)
        .set(commonHeaders)
        .send({}) // Missing amount
        .expect(400)

      expect(response.body.error || response.body.message).toBeDefined()
    })

    it('should deduct funds from a wallet', async () => {
      const amountToDeduct = -25

      const response = await request(app)
        .post(`/wallets/${testUserId}/balance`)
        .set(commonHeaders)
        .send({ amount: amountToDeduct })
        .expect(200)

      expect(response.body).toBeDefined()
      expect(response.body.userId).toBe(testUserId)
      expect(response.body.balance).toBe(initialBalance + amountToDeduct)
    })

    it('should create a new wallet if it does not exist', async () => {
      const newUserId = randomUUID()
      const initialAmount = 75

      const response = await request(app)
        .post(`/wallets/${newUserId}/balance`)
        .set(commonHeaders)
        .send({ amount: initialAmount })
        .expect(200)

      expect(response.body).toBeDefined()
      expect(response.body.userId).toBe(newUserId)
      expect(response.body.balance).toBe(initialAmount)
    })

    it('should handle string amounts correctly', async () => {
      // Some APIs might send stringified numbers
      const response = await request(app)
        .post(`/wallets/${testUserId}/balance`)
        .set(commonHeaders)
        .send({ amount: '30' })
        .expect(200)

      expect(response.body.balance).toBe(initialBalance + 30)
    })

    it('should handle invalid amount formats appropriately', async () => {
      const response = await request(app)
        .post(`/wallets/${testUserId}/balance`)
        .set(commonHeaders)
        .send({ amount: 'not-a-number' })
        .expect(400)

      expect(response.body.message).toBeDefined()
    })
  })

  describe('Late Return', () => {
    it('should apply late fee when days late is small', async () => {
      const daysLate = 3
      const retailPrice = 30
      // Expected fee: 3 days * 0.2€ = 0.6€

      const response = await request(app)
        .patch(`/wallets/${testUserId}/late-return`)
        .set(commonHeaders)
        .send({ daysLate, retailPrice })
        .expect(200)

      expect(response.body.message).toBe('Late fee applied.')
      expect(response.body.wallet).toBeDefined()
      expect(response.body.wallet.userId).toBe(testUserId)
      expect(response.body.wallet.balance).toBe(initialBalance - daysLate * 0.2)
    })

    it('should return validation error for invalid userId format', async () => {
      const response = await request(app)
        .patch('/wallets/invalid-user-id/late-return')
        .set(commonHeaders)
        .send({ daysLate: 3, retailPrice: 20 })
        .expect(400)

      expect(response.body.error || response.body.message).toBeDefined()
    })

    it('should return validation error for invalid request body', async () => {
      // Missing required fields
      const response = await request(app)
        .patch(`/wallets/${testUserId}/late-return`)
        .set(commonHeaders)
        .send({}) // Empty body
        .expect(400)

      expect(response.body.error || response.body.message).toBeDefined()
    })

    it('should mark book as bought when late fee exceeds retail price', async () => {
      const daysLate = 50
      const retailPrice = 5
      // Expected fee: 50 days * 0.2€ = 10€, which exceeds retail price of 5€

      const response = await request(app)
        .patch(`/wallets/${testUserId}/late-return`)
        .set(commonHeaders)
        .send({ daysLate, retailPrice })
        .expect(200)

      expect(response.body.message).toContain('book is considered bought')
      expect(response.body.wallet).toBeDefined()
      expect(response.body.wallet.userId).toBe(testUserId)
      expect(response.body.wallet.balance).toBe(initialBalance - daysLate * 0.2)
    })

    it('should create a wallet if it does not exist when applying late fee', async () => {
      const newUserId = randomUUID()
      const daysLate = 2
      const retailPrice = 20
      // Expected fee: 2 days * 0.2€ = 0.4€

      const response = await request(app)
        .patch(`/wallets/${newUserId}/late-return`)
        .set(commonHeaders)
        .send({ daysLate, retailPrice })
        .expect(200)

      expect(response.body.message).toBe('Late fee applied.')
      expect(response.body.wallet).toBeDefined()
      expect(response.body.wallet.userId).toBe(newUserId)
      expect(response.body.wallet.balance).toBe(-(daysLate * 0.2))
    })

    it('should validate required parameters', async () => {
      // Missing daysLate
      const response1 = await request(app)
        .patch(`/wallets/${testUserId}/late-return`)
        .set(commonHeaders)
        .send({ retailPrice: 20 })
        .expect(400)

      expect(response1.body.message).toBeDefined()

      // Missing retailPrice
      const response2 = await request(app)
        .patch(`/wallets/${testUserId}/late-return`)
        .set(commonHeaders)
        .send({ daysLate: 3 })
        .expect(400)

      expect(response2.body.message).toBeDefined()
    })

    it('should handle negative days late values appropriately', async () => {
      const response = await request(app)
        .patch(`/wallets/${testUserId}/late-return`)
        .set(commonHeaders)
        .send({ daysLate: -1, retailPrice: 20 })
        .expect(400)

      expect(response.body.message).toBeDefined()
    })

    it('should handle negative retail price values appropriately', async () => {
      const response = await request(app)
        .patch(`/wallets/${testUserId}/late-return`)
        .set(commonHeaders)
        .send({ daysLate: 3, retailPrice: -10 })
        .expect(400)

      expect(response.body.message).toBeDefined()
    })
  })
})
