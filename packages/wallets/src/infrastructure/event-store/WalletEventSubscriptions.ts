import {
  RESERVATION_PENDING_PAYMENT,
  RESERVATION_RETURNED,
  WALLET_BALANCE_UPDATED,
  WALLET_CREATED,
  WALLET_LATE_FEE_APPLIED,
} from '@book-library-tool/event-store'
import { type EventBusPort } from '@book-library-tool/event-store'
import { logger } from '@book-library-tool/shared'
import { BookReturnHandler } from '@wallets/application/use_cases/commands/BookReturnHandler.js'
import { ProcessWalletPaymentHandler } from '@wallets/application/use_cases/commands/ProcessWalletPaymentHandler.js'
import { WalletProjectionHandler } from '@wallets/infrastructure/event-store/WalletProjectionHandler.js'

/**
 * Sets up event subscriptions for wallet-related events.
 * This module configures the event-driven architecture for the wallet context,
 * handling both internal wallet events and cross-domain events from the
 * reservations context.
 *
 * The subscriptions maintain eventual consistency by:
 * - Updating wallet projections for internal events
 * - Processing payment requests from reservations
 * - Handling book returns and late fee applications
 * - Managing error scenarios and logging
 */
export function WalletEventSubscriptions(
  eventBus: EventBusPort,
  projectionHandler: WalletProjectionHandler,
  paymentHandler: ProcessWalletPaymentHandler,
  bookReturnHandler: BookReturnHandler,
): void {
  // Subscribe to WALLET_CREATED events
  eventBus.subscribe(WALLET_CREATED, async (event) => {
    try {
      logger.info(
        `Handling WALLET_CREATED event: ${JSON.stringify(event, null, 2)}`,
      )

      await projectionHandler.handleWalletCreated(event)
    } catch (error) {
      logger.error(`Error handling WALLET_CREATED event: ${error}`)
    }
  })

  // Subscribe to WALLET_BALANCE_UPDATED events
  eventBus.subscribe(WALLET_BALANCE_UPDATED, async (event) => {
    try {
      logger.info(
        `Handling WALLET_BALANCE_UPDATED event: ${JSON.stringify(event, null, 2)}`,
      )

      await projectionHandler.handleWalletBalanceUpdated(event)
    } catch (error) {
      logger.error(`Error handling WALLET_BALANCE_UPDATED event: ${error}`)
    }
  })

  // Subscribe to RESERVATION_RETURNED events
  eventBus.subscribe(RESERVATION_RETURNED, async (event) => {
    try {
      logger.info(
        `Handling RESERVATION_RETURNED event: ${JSON.stringify(event, null, 2)}`,
      )

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
        id: event.payload.id,
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

  // Subscribe to WALLET_LATE_FEE_APPLIED events
  eventBus.subscribe(WALLET_LATE_FEE_APPLIED, async (event) => {
    try {
      logger.info(
        `Handling WALLET_LATE_FEE_APPLIED event: ${JSON.stringify(event, null, 2)}`,
      )

      await projectionHandler.handleWalletLateFeeApplied(event)
    } catch (error) {
      logger.error(`Error handling WALLET_LATE_FEE_APPLIED event: ${error}`)
    }
  })

  logger.info('Wallet event subscriptions configured successfully')
}
