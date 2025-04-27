import {
  BOOK_DELETED,
  BOOK_UPDATED,
  BOOK_VALIDATION_RESULT,
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
import { type EventBusPort } from '@book-library-tool/event-store'
import { RedisService } from '@book-library-tool/redis'
import type { DomainEvent } from '@book-library-tool/shared'
import { logger } from '@book-library-tool/shared'
import { BookBroughtHandler } from '@reservations/application/use_cases/commands/BookBroughtHandler.js'
import { PaymentHandler } from '@reservations/application/use_cases/commands/PaymentHandler.js'
import { ValidateReservationHandler } from '@reservations/application/use_cases/commands/ValidateReservationHandler.js'
import { ReservationProjectionHandler } from '@reservations/infrastructure/event-store/ReservationProjectionHandler.js'

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
export function ReservationEventSubscriptions(
  eventBus: EventBusPort,
  cacheService: RedisService,
  projectionHandler: ReservationProjectionHandler,
  validateReservationHandler: ValidateReservationHandler,
  paymentHandler: PaymentHandler,
  bookBroughtHandler: BookBroughtHandler,
): void {
  // Internal domain events for reservations
  eventBus.subscribe(RESERVATION_CREATED, async (event: DomainEvent) => {
    try {
      logger.info(
        `Handling RESERVATION_CREATED event: ${JSON.stringify(event, null, 2)}`,
      )

      await projectionHandler.handleReservationCreated(event)

      await cacheService.delPattern('reservation:getReservationHistory*')
    } catch (error) {
      logger.error(`Error handling ReservationCreated event: ${error}`)
    }
  })

  eventBus.subscribe(RESERVATION_RETURNED, async (event: DomainEvent) => {
    try {
      logger.info(
        `Handling RESERVATION_RETURNED event: ${JSON.stringify(event, null, 2)}`,
      )

      await projectionHandler.handleReservationReturned(event)

      await cacheService.delPattern('reservation:getReservationHistory*')
    } catch (error) {
      logger.error(`Error handling ReservationReturned event: ${error}`)
    }
  })

  eventBus.subscribe(RESERVATION_CANCELLED, async (event: DomainEvent) => {
    try {
      logger.info(
        `Handling RESERVATION_CANCELLED event: ${JSON.stringify(event, null, 2)}`,
      )

      await projectionHandler.handleReservationCancelled(event)

      await cacheService.delPattern('reservation:getReservationHistory*')
    } catch (error) {
      logger.error(`Error handling ReservationCancelled event: ${error}`)
    }
  })

  eventBus.subscribe(RESERVATION_OVERDUE, async (event: DomainEvent) => {
    try {
      logger.info(
        `Handling RESERVATION_OVERDUE event: ${JSON.stringify(event, null, 2)}`,
      )

      await projectionHandler.handleReservationOverdue(event)

      await cacheService.delPattern('reservation:getReservationHistory*')
    } catch (error) {
      logger.error(`Error handling ReservationOverdue event: ${error}`)
    }
  })

  eventBus.subscribe(RESERVATION_DELETED, async (event: DomainEvent) => {
    try {
      logger.info(
        `Handling RESERVATION_DELETED event: ${JSON.stringify(event, null, 2)}`,
      )

      await projectionHandler.handleReservationDeleted(event)

      await cacheService.delPattern('reservation:getReservationHistory*')
    } catch (error) {
      logger.error(`Error handling ReservationDeleted event: ${error}`)
    }
  })

  /**
   * Handles book validation results from the books bounded context.
   * Updates both the read model (projection) and the write model (reservation aggregate)
   * with the validation outcome.
   */
  eventBus.subscribe(BOOK_VALIDATION_RESULT, async (event: DomainEvent) => {
    try {
      logger.debug(
        `Processing BookValidationResult event for reservation ${event.payload.reservationId}`,
      )

      await validateReservationHandler.execute(event, {
        reservationId: event.payload.reservationId,
        bookId: event.payload.bookId,
        isValid: event.payload.isValid,
        reason: event.payload.reason,
        retailPrice: event.payload.retailPrice,
      })

      await cacheService.delPattern('reservation:getReservationHistory*')
    } catch (error) {
      logger.error(`Error handling BookValidationResult event: ${error}`)
    }
  })

  /**
   * Handles book updates from the books bounded context.
   * Only processes updates that affect the book's title, as this is relevant
   * for reservation records.
   */
  eventBus.subscribe(BOOK_UPDATED, async (event: DomainEvent) => {
    try {
      logger.info(
        `Handling BOOK_UPDATED event: ${JSON.stringify(event, null, 2)}`,
      )

      // Only handle this event if the title was updated
      if (event.payload.updated && event.payload.updated.title) {
        await projectionHandler.handleBookDetailsUpdated(event)

        await cacheService.delPattern('reservation:getReservationHistory*')
      }
    } catch (error) {
      logger.error(`Error handling BookUpdated event: ${error}`)
    }
  })

  /**
   * Handles book deletions from the books bounded context.
   * Updates the reservation projection to reflect the book's deletion.
   */
  eventBus.subscribe(BOOK_DELETED, async (event: DomainEvent) => {
    try {
      logger.info(
        `Handling BOOK_DELETED event: ${JSON.stringify(event, null, 2)}`,
      )

      await projectionHandler.handleBookDeleted(event)

      await cacheService.delPattern('reservation:getReservationHistory*')
    } catch (error) {
      logger.error(`Error handling BookDeleted event: ${error}`)
    }
  })

  /**
   * Handles declined payment events from the wallet bounded context.
   * Updates the reservation state to reflect the failed payment.
   */
  eventBus.subscribe(WALLET_PAYMENT_DECLINED, async (event: DomainEvent) => {
    try {
      logger.info(
        `Handling WALLET_PAYMENT_DECLINED event: ${JSON.stringify(event, null, 2)}`,
      )

      await paymentHandler.handlePaymentDeclined(event)

      await cacheService.delPattern('reservation:getReservationHistory*')
    } catch (error) {
      logger.error(`Error handling payment declined event: ${error}`, error)
    }
  })

  /**
   * Handles successful payment events from the wallet bounded context.
   * Updates the reservation state to reflect the completed payment.
   */
  eventBus.subscribe(WALLET_PAYMENT_SUCCESS, async (event: DomainEvent) => {
    try {
      logger.info(
        `Handling WALLET_PAYMENT_SUCCESS event: ${JSON.stringify(event, null, 2)}`,
      )

      await paymentHandler.handlePaymentSuccess(event)

      await cacheService.delPattern('reservation:getReservationHistory*')
    } catch (error) {
      logger.error(`Error handling payment success event: ${error}`, error)
    }
  })

  /**
   * Handles retail price updates for reservations.
   * Updates the projection with the new price information.
   */
  eventBus.subscribe(
    RESERVATION_RETAIL_PRICE_UPDATED,
    async (event: DomainEvent) => {
      try {
        logger.info(
          `Handling RESERVATION_RETAIL_PRICE_UPDATED event: ${JSON.stringify(event, null, 2)}`,
        )

        await projectionHandler.handleRetailPriceUpdated(event)

        await cacheService.delPattern('reservation:getReservationHistory*')
      } catch (error) {
        logger.error(
          `Error handling RESERVATION_RETAIL_PRICE_UPDATED event: ${error}`,
        )
      }
    },
  )

  /**
   * Handles events when a book is brought back to the library.
   * Updates the reservation projection to reflect the book's return.
   */
  eventBus.subscribe(RESERVATION_BOOK_BROUGHT, async (event: DomainEvent) => {
    try {
      logger.info(
        `Handling RESERVATION_BOOK_BROUGHT event: ${JSON.stringify(event, null, 2)}`,
      )

      await projectionHandler.handleReservationBookBrought(event)

      await cacheService.delPattern('reservation:getReservationHistory*')
    } catch (error) {
      logger.error(`Error handling RESERVATION_BOOK_BROUGHT event: ${error}`)
    }
  })

  /**
   * Handles late fee application events from the wallet bounded context.
   * If the late fees have accumulated to the purchase price, triggers
   * the book purchase process.
   */
  eventBus.subscribe(WALLET_LATE_FEE_APPLIED, async (event: DomainEvent) => {
    try {
      logger.info(
        `Handling WALLET_LATE_FEE_APPLIED event: ${JSON.stringify(event, null, 2)}`,
      )

      // Check if the book was purchased based on late fees
      if (event.payload.bookBrought) {
        await bookBroughtHandler.execute({
          userId: event.payload.userId,
          reservationId: event.payload.reservationId,
          lateFees: event.payload.lateFees,
          retailPrice: event.payload.retailPrice,
        })

        await cacheService.delPattern('reservation:getReservationHistory*')
      }
    } catch (error) {
      logger.error(`Error handling WALLET_LATE_FEE_APPLIED event: ${error}`)
    }
  })

  logger.info('Reservation event subscriptions configured successfully')
}
