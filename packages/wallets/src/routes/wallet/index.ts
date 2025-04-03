import { Router } from 'express'
import { walletHandler } from './walletHandler.js'
import { validateBody, validateParams } from '@book-library-tool/api'
import { schemas } from '@book-library-tool/api'

export default Router()
  .get(
    '/:userId',
    validateParams(schemas.UserIdSchema),
    walletHandler.getWallet,
  )
  .post(
    '/:userId/balance',
    validateParams(schemas.UserIdSchema),
    validateBody(schemas.WalletBalanceRequestSchema),
    walletHandler.updateWalletBalance,
  )
  .patch(
    '/:userId/late-return',
    validateParams(schemas.UserIdSchema),
    validateBody(schemas.LateReturnRequestSchema),
    walletHandler.lateReturn,
  )
