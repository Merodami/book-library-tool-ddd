import {
  BOOK_CREATED,
  BOOK_DELETED,
  BOOK_UPDATED,
  EventBus,
} from '@book-library-tool/event-store'
import { logger } from '@book-library-tool/shared'
import { BookProjectionHandler } from '@event-store/BookProjectionHandler.js'

/**
 * Set up event subscriptions for book-related events.
 * This function subscribes to BOOK_CREATED, BOOK_UPDATED, and BOOK_DELETED events,
 * and calls the corresponding methods on the projection handler.
 *
 * Using async callbacks with try/catch ensures that errors are caught and logged,
 * preventing unhandled promise rejections.
 */
export function setupEventSubscriptions(
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

  logger.info('Book event subscriptions configured successfully')
}
