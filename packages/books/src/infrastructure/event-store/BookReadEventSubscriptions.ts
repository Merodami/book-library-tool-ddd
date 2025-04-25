import {
  createErrorEvent,
  type EventBusPort,
  RESERVATION_BOOK_VALIDATION,
  RESERVATION_BOOK_VALIDATION_FAILED,
} from '@book-library-tool/event-store'
import type { DomainEvent } from '@book-library-tool/shared'
import { logger } from '@book-library-tool/shared'
import type { BookReadProjectionHandler } from '@books/infrastructure/index.js'

/**
 * Set up event subscriptions for book-related events.
 *
 * Using async callbacks with try/catch ensures that errors are caught and logged,
 * preventing unhandled promise rejections.
 */
export function BookReadEventSubscriptions(
  eventBus: EventBusPort,
  projectionReadHandler: BookReadProjectionHandler,
): void {
  eventBus.subscribe(
    RESERVATION_BOOK_VALIDATION,
    async (event: DomainEvent) => {
      try {
        logger.info(
          `Handling RESERVATION_BOOK_VALIDATION event: ${JSON.stringify(event, null, 2)}`,
        )

        // Process the validation request and get the result event
        const validationResultEvent =
          await projectionReadHandler.handleValidateBook(event)

        // Publish the validation result
        await eventBus.publish(validationResultEvent)

        logger.info(
          `Book validation for reservation ${event.payload.reservationId}: ${validationResultEvent.payload.isValid ? 'Valid' : 'Invalid'}`,
        )
      } catch (error) {
        logger.error(`Error validating book for reservation: ${error}`)

        // Create and publish generic error response
        const errorEvent = createErrorEvent(
          event,
          error,
          RESERVATION_BOOK_VALIDATION_FAILED,
        )

        // Optionally add specific fields needed for error recovery
        errorEvent.payload.reservationId = event.payload.reservationId
        errorEvent.payload.isbn = event.payload.isbn

        await eventBus.publish(errorEvent)
      }
    },
  )

  logger.info('Book event subscriptions configured successfully')
}
