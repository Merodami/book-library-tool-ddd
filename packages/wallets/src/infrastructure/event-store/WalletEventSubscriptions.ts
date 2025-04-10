import {
  EventBus,
  RESERVATION_PENDING_PAYMENT,
  RESERVATION_RETURNED,
  WALLET_BALANCE_UPDATED,
  WALLET_CREATED,
  WALLET_LATE_FEE_APPLIED,
} from '@book-library-tool/event-store'
import { logger } from '@book-library-tool/shared'
import { ProcessWalletPaymentHandler } from '@commands/ProcessWalletPaymentHandler.js'
import { WalletProjectionHandler } from '@event-store/WalletProjectionHandler.js'
import { BookReturnHandler } from '@use_cases/commands/BookReturnHandler.js'

/**
 * Sets up event subscriptions for wallet-related events
 */
export function SetupEventSubscriptions(
  eventBus: EventBus,
  projectionHandler: WalletProjectionHandler,
  paymentHandler: ProcessWalletPaymentHandler,
  bookReturnHandler: BookReturnHandler,
): void {
  // Subscribe to WALLET_CREATED events
  eventBus.subscribe(WALLET_CREATED, async (event) => {
    try {
      await projectionHandler.handleWalletCreated(event)
    } catch (error) {
      logger.error(`Error handling WALLET_CREATED event: ${error}`)
    }
  })

  // Subscribe to WALLET_BALANCE_UPDATED events
  eventBus.subscribe(WALLET_BALANCE_UPDATED, async (event) => {
    try {
      await projectionHandler.handleWalletBalanceUpdated(event)
    } catch (error) {
      logger.error(`Error handling WALLET_BALANCE_UPDATED event: ${error}`)
    }
  })

  // Subscribe to RESERVATION_RETURNED events
  eventBus.subscribe(RESERVATION_RETURNED, async (event) => {
    try {
      await bookReturnHandler.execute({
        reservationId: event.payload.reservationId,
        userId: event.payload.userId,
        daysLate: Number(event.payload.daysLate),
        retailPrice: Number(event.payload.retailPrice),
      })
    } catch (error) {
      logger.error(`Error handling RESERVATION_RETURNED event: ${error}`)
    }
  })

  // Subscribe to RESERVATION_PAYMENT_REQUESTED events
  eventBus.subscribe(RESERVATION_PENDING_PAYMENT, async (event) => {
    try {
      logger.info(
        `Processing payment request for reservation ${event.payload.reservationId}`,
      )

      await paymentHandler.execute({
        userId: event.payload.userId,
        reservationId: event.payload.reservationId,
        amount: event.payload.amount,
      })
    } catch (error) {
      logger.error(`Error handling RESERVATION_PENDING_PAYMENT event: ${error}`)
      // Error is already handled within the payment handler,
      // which publishes the appropriate declined event
    }
  })

  eventBus.subscribe(WALLET_LATE_FEE_APPLIED, async (event) => {
    try {
      await projectionHandler.handleWalletLateFeeApplied(event)
    } catch (error) {
      logger.error(`Error handling WALLET_LATE_FEE_APPLIED event: ${error}`)
    }
  })

  logger.info('Wallet event subscriptions configured successfully')
}
