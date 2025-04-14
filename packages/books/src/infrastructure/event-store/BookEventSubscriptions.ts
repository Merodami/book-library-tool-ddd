import {
  BOOK_CREATED,
  BOOK_DELETED,
  BOOK_UPDATED,
  createErrorEvent,
  EventBus,
  RESERVATION_BOOK_VALIDATION,
  RESERVATION_BOOK_VALIDATION_FAILED,
} from '@book-library-tool/event-store'
import { logger } from '@book-library-tool/shared'
import { BookProjectionHandler } from '@books/event-store/BookProjectionHandler.js'

/**
 * Set up event subscriptions for book-related events.
 * This function subscribes to BOOK_CREATED, BOOK_UPDATED, and BOOK_DELETED events,
 * and calls the corresponding methods on the projection handler.
 *
 * Using async callbacks with try/catch ensures that errors are caught and logged,
 * preventing unhandled promise rejections.
 */
export function BookEventSubscriptions(
  eventBus: EventBus,
  projectionHandler: BookProjectionHandler,
): void {
  // Subscribe to BOOK_CREATED events and handle them asynchronously.
  eventBus.subscribe(BOOK_CREATED, async (event) => {
    try {
      await projectionHandler.handleBookCreated(event)
    } catch (error) {
      logger.error(`Error handling BOOK_CREATED event: ${error}`)
    }
  })

  // Subscribe to BOOK_UPDATED events and handle them asynchronously.
  eventBus.subscribe(BOOK_UPDATED, async (event) => {
    try {
      await projectionHandler.handleBookUpdated(event)
    } catch (error) {
      logger.error(`Error handling BOOK_UPDATED event: ${error}`)
    }
  })

  // Subscribe to BOOK_DELETED events and handle them asynchronously.
  eventBus.subscribe(BOOK_DELETED, async (event) => {
    try {
      await projectionHandler.handleBookDeleted(event)
    } catch (error) {
      logger.error(`Error handling BOOK_DELETED event: ${error}`)
    }
  })

  eventBus.subscribe(RESERVATION_BOOK_VALIDATION, async (event) => {
    try {
      // Process the validation request and get the result event
      const validationResultEvent =
        await projectionHandler.handleReservationValidateBook(event)

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
  })

  logger.info('Book event subscriptions configured successfully')
}
