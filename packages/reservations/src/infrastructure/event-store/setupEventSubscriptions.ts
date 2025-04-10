import { EventBus } from '@book-library-tool/event-store'
import { logger } from '@book-library-tool/shared'

import { ReservationProjectionHandler } from './ReservationProjectionHandler.js'

export function setupEventSubscriptions(
  eventBus: EventBus,
  projectionHandler: ReservationProjectionHandler,
): void {
  // Internal domain events for reservations
  eventBus.subscribe('ReservationCreated', async (event) => {
    try {
      await projectionHandler.handleReservationCreated(event)
    } catch (error) {
      logger.error(`Error handling ReservationCreated event: ${error}`)
    }
  })

  eventBus.subscribe('ReservationReturned', async (event) => {
    try {
      await projectionHandler.handleReservationReturned(event)
    } catch (error) {
      logger.error(`Error handling ReservationReturned event: ${error}`)
    }
  })

  eventBus.subscribe('ReservationCancelled', async (event) => {
    try {
      await projectionHandler.handleReservationCancelled(event)
    } catch (error) {
      logger.error(`Error handling ReservationCancelled event: ${error}`)
    }
  })

  eventBus.subscribe('ReservationOverdue', async (event) => {
    try {
      await projectionHandler.handleReservationOverdue(event)
    } catch (error) {
      logger.error(`Error handling ReservationOverdue event: ${error}`)
    }
  })

  eventBus.subscribe('ReservationDeleted', async (event) => {
    try {
      await projectionHandler.handleReservationDeleted(event)
    } catch (error) {
      logger.error(`Error handling ReservationDeleted event: ${error}`)
    }
  })

  // Cross-service events from the books domain
  eventBus.subscribe('BookUpdated', async (event) => {
    try {
      // Only handle this event if the title was updated
      if (event.payload.updated && event.payload.updated.title) {
        await projectionHandler.handleBookDetailsUpdated(event)
      }
    } catch (error) {
      logger.error(`Error handling BookUpdated event: ${error}`)
    }
  })

  eventBus.subscribe('BookDeleted', async (event) => {
    try {
      await projectionHandler.handleBookDeleted(event)
    } catch (error) {
      logger.error(`Error handling BookDeleted event: ${error}`)
    }
  })

  logger.info('Reservation event subscriptions configured successfully')
}
