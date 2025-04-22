import {
  createErrorEvent,
  DomainEvent,
  EventBus,
  RESERVATION_BOOK_VALIDATION,
  RESERVATION_BOOK_VALIDATION_FAILED,
} from '@book-library-tool/event-store'
import { logger } from '@book-library-tool/shared'
import { BookReadProjectionHandler } from '@books/event-store/BookReadProjectionHandler.js'

/**
 * Set up event subscriptions for book-related events.
 *
 * Using async callbacks with try/catch ensures that errors are caught and logged,
 * preventing unhandled promise rejections.
 */
export function BookReadEventSubscriptions(
  eventBus: EventBus,
  projectionReadHandler: BookReadProjectionHandler,
): void {
  eventBus.subscribe(
    RESERVATION_BOOK_VALIDATION,
    async (event: DomainEvent) => {
      try {
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
