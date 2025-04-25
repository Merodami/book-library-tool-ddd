import {
  BOOK_CREATED,
  BOOK_CREATION_FAILED,
  BOOK_DELETED,
  BOOK_UPDATED,
  createErrorEvent,
  type EventBusPort,
} from '@book-library-tool/event-store'
import {
  httpRequestKeyGenerator,
  ICacheService,
} from '@book-library-tool/redis'
import type { DomainEvent } from '@book-library-tool/shared'
import { logger } from '@book-library-tool/shared'
import type { BookWriteProjectionHandler } from '@books/infrastructure/index.js'

/**
 * Set up event subscriptions for book-related events.
 * This function subscribes to BOOK_CREATED, BOOK_UPDATED, and BOOK_DELETED events,
 * and calls the corresponding methods on the projection handler.
 *
 * Using async callbacks with try/catch ensures that errors are caught and logged,
 * preventing unhandled promise rejections.
 */
export function BookWriteEventSubscriptions(
  eventBus: EventBusPort,
  cacheService: ICacheService,
  projectionWriteHandler: BookWriteProjectionHandler,
): void {
  // Subscribe to BOOK_CREATED events and handle them asynchronously.
  eventBus.subscribe(BOOK_CREATED, async (event: DomainEvent) => {
    try {
      logger.info(
        `Handling BOOK_CREATED event: ${JSON.stringify(event, null, 2)}`,
      )

      await projectionWriteHandler.handleBookCreated(event)

      // Delete the cache for the catalog
      await cacheService.delPattern('catalog:getAllBooks*')
    } catch (error) {
      logger.error(`Error handling BOOK_CREATED event: ${error}`)

      const errorEvent = createErrorEvent(event, error, BOOK_CREATION_FAILED)

      await eventBus.publish(errorEvent)
    }
  })

  // Subscribe to BOOK_UPDATED events and handle them asynchronously.
  eventBus.subscribe(BOOK_UPDATED, async (event: DomainEvent) => {
    try {
      logger.info(
        `Handling BOOK_UPDATED event: ${JSON.stringify(event, null, 2)}`,
      )

      await projectionWriteHandler.handleBookUpdated(event)

      // Delete the cache for the book
      const key = httpRequestKeyGenerator('book', 'getBook', [
        { params: { id: event.aggregateId } },
      ])

      await cacheService.del(key)

      // Delete the cache for the catalog
      await cacheService.delPattern('catalog:getAllBooks*')
    } catch (error) {
      logger.error(`Error handling BOOK_UPDATED event: ${error}`)
    }
  })

  // Subscribe to BOOK_DELETED events and handle them asynchronously.
  eventBus.subscribe(BOOK_DELETED, async (event: DomainEvent) => {
    // Delete the cache for the book
    const key = httpRequestKeyGenerator('book', 'getBook', [
      { params: { id: event.aggregateId } },
    ])

    try {
      logger.info(
        `Handling BOOK_DELETED event: ${JSON.stringify(event, null, 2)}`,
      )

      await projectionWriteHandler.handleBookDeleted(event)
    } catch (error) {
      logger.error(`Error handling BOOK_DELETED event: ${error}`)
    } finally {
      // Delete the cache for the book
      await cacheService.del(key)

      // Delete the cache for the catalog
      await cacheService.delPattern('catalog:getAllBooks*')
    }
  })

  logger.info('Book event subscriptions configured successfully')
}
