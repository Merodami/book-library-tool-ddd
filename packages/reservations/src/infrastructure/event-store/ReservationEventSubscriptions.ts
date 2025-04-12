import {
  BOOK_DELETED,
  BOOK_UPDATED,
  BOOK_VALIDATION_RESULT,
  EventBus,
  RESERVATION_BOOK_BROUGHT,
  RESERVATION_CANCELLED,
  RESERVATION_CREATED,
  RESERVATION_DELETED,
  RESERVATION_OVERDUE,
  RESERVATION_RETAIL_PRICE_UPDATED,
  RESERVATION_RETURNED,
  WALLET_LATE_FEE_APPLIED,
  WALLET_PAYMENT_DECLINED,
  WALLET_PAYMENT_SUCCESS,
} from '@book-library-tool/event-store'
import { logger } from '@book-library-tool/shared'
import { ValidateReservationHandler } from '@commands/ValidateReservationHandler.js'
import { ReservationProjectionHandler } from '@event-store/ReservationProjectionHandler.js'
import { BookBroughtHandler } from '@use_cases/commands/BookBroughtHandler.js'
import { PaymentHandler } from '@use_cases/commands/PaymentHandler.js'

/**
 * Configures all event subscriptions for the reservations bounded context.
 * This function sets up handlers for:
 * - Internal reservation domain events (created, returned, cancelled, etc.)
 * - Cross-domain events from the books context (updates, deletions)
 * - Payment-related events from the wallet context
 * - Late fee and purchase events
 *
 * Each subscription includes error handling and logging to ensure
 * system stability and observability.
 *
 * @param eventBus - The event bus instance for publishing/subscribing to events
 * @param projectionHandler - Handler for updating the read model
 * @param validateReservationHandler - Handler for validating reservations
 * @param paymentHandler - Handler for processing payment events
 * @param bookBroughtHandler - Handler for processing book purchase scenarios
 */
export function SetupEventSubscriptions(
  eventBus: EventBus,
  projectionHandler: ReservationProjectionHandler,
  validateReservationHandler: ValidateReservationHandler,
  paymentHandler: PaymentHandler,
  bookBroughtHandler: BookBroughtHandler,
): void {
  // Internal domain events for reservations
  eventBus.subscribe(RESERVATION_CREATED, async (event) => {
    try {
      await projectionHandler.handleReservationCreated(event)
    } catch (error) {
      logger.error(`Error handling ReservationCreated event: ${error}`)
    }
  })

  eventBus.subscribe(RESERVATION_RETURNED, async (event) => {
    try {
      await projectionHandler.handleReservationReturned(event)
    } catch (error) {
      logger.error(`Error handling ReservationReturned event: ${error}`)
    }
  })

  eventBus.subscribe(RESERVATION_CANCELLED, async (event) => {
    try {
      await projectionHandler.handleReservationCancelled(event)
    } catch (error) {
      logger.error(`Error handling ReservationCancelled event: ${error}`)
    }
  })

  eventBus.subscribe(RESERVATION_OVERDUE, async (event) => {
    try {
      await projectionHandler.handleReservationOverdue(event)
    } catch (error) {
      logger.error(`Error handling ReservationOverdue event: ${error}`)
    }
  })

  eventBus.subscribe(RESERVATION_DELETED, async (event) => {
    try {
      await projectionHandler.handleReservationDeleted(event)
    } catch (error) {
      logger.error(`Error handling ReservationDeleted event: ${error}`)
    }
  })

  /**
   * Handles book validation results from the books bounded context.
   * Updates both the read model (projection) and the write model (reservation aggregate)
   * with the validation outcome.
   */
  eventBus.subscribe(BOOK_VALIDATION_RESULT, async (event) => {
    try {
      logger.debug(
        `Processing BookValidationResult event for reservation ${event.payload.reservationId}`,
      )

      // Also update the write model (reservation aggregate)
      await validateReservationHandler.execute(event, {
        reservationId: event.payload.reservationId,
        isValid: event.payload.isValid,
        reason: event.payload.reason,
        retailPrice: event.payload.retailPrice,
      })
    } catch (error) {
      logger.error(`Error handling BookValidationResult event: ${error}`)
    }
  })

  /**
   * Handles book updates from the books bounded context.
   * Only processes updates that affect the book's title, as this is relevant
   * for reservation records.
   */
  eventBus.subscribe(BOOK_UPDATED, async (event) => {
    try {
      // Only handle this event if the title was updated
      if (event.payload.updated && event.payload.updated.title) {
        await projectionHandler.handleBookDetailsUpdated(event)
      }
    } catch (error) {
      logger.error(`Error handling BookUpdated event: ${error}`)
    }
  })

  /**
   * Handles book deletions from the books bounded context.
   * Updates the reservation projection to reflect the book's deletion.
   */
  eventBus.subscribe(BOOK_DELETED, async (event) => {
    try {
      await projectionHandler.handleBookDeleted(event)
    } catch (error) {
      logger.error(`Error handling BookDeleted event: ${error}`)
    }
  })

  /**
   * Handles declined payment events from the wallet bounded context.
   * Updates the reservation state to reflect the failed payment.
   */
  eventBus.subscribe(WALLET_PAYMENT_DECLINED, async (event) => {
    try {
      await paymentHandler.handlePaymentDeclined(event)
    } catch (error) {
      logger.error(`Error handling payment declined event: ${error}`, error)
    }
  })

  /**
   * Handles successful payment events from the wallet bounded context.
   * Updates the reservation state to reflect the completed payment.
   */
  eventBus.subscribe(WALLET_PAYMENT_SUCCESS, async (event) => {
    try {
      await paymentHandler.handlePaymentSuccess(event)
    } catch (error) {
      logger.error(`Error handling payment success event: ${error}`, error)
    }
  })

  /**
   * Handles retail price updates for reservations.
   * Updates the projection with the new price information.
   */
  eventBus.subscribe(RESERVATION_RETAIL_PRICE_UPDATED, async (event) => {
    try {
      await projectionHandler.handleRetailPriceUpdated(event)
    } catch (error) {
      logger.error(
        `Error handling RESERVATION_RETAIL_PRICE_UPDATED event: ${error}`,
      )
    }
  })

  /**
   * Handles events when a book is brought back to the library.
   * Updates the reservation projection to reflect the book's return.
   */
  eventBus.subscribe(RESERVATION_BOOK_BROUGHT, async (event) => {
    try {
      await projectionHandler.handleReservationBookBrought(event)
    } catch (error) {
      logger.error(`Error handling RESERVATION_BOOK_BROUGHT event: ${error}`)
    }
  })

  /**
   * Handles late fee application events from the wallet bounded context.
   * If the late fees have accumulated to the purchase price, triggers
   * the book purchase process.
   */
  eventBus.subscribe(WALLET_LATE_FEE_APPLIED, async (event) => {
    try {
      // Check if the book was purchased based on late fees
      if (event.payload.bookBrought) {
        await bookBroughtHandler.execute({
          userId: event.payload.userId,
          reservationId: event.payload.reservationId,
          lateFees: event.payload.lateFees,
          retailPrice: event.payload.retailPrice,
        })
      }
    } catch (error) {
      logger.error(`Error handling WALLET_LATE_FEE_APPLIED event: ${error}`)
    }
  })

  logger.info('Reservation event subscriptions configured successfully')
}
