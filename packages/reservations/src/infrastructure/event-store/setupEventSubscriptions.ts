import {
  BOOK_DELETED,
  BOOK_UPDATED,
  BOOK_VALIDATION_RESULT,
  EventBus,
  RESERVATION_CANCELLED,
  RESERVATION_CREATED,
  RESERVATION_DELETED,
  RESERVATION_OVERDUE,
  RESERVATION_RETURNED,
} from '@book-library-tool/event-store'
import { logger } from '@book-library-tool/shared'
import { ValidateReservationHandler } from '@commands/ValidateReservationHandler.js'
import { ReservationProjectionHandler } from '@event-store/ReservationProjectionHandler.js'
import { IReservationProjectionRepository } from '@repositories/IReservationProjectionRepository.js'
import { IReservationRepository } from '@repositories/IReservationRepository.js'

export function SetupEventSubscriptions(
  eventBus: EventBus,
  projectionHandler: ReservationProjectionHandler,
  reservationRepository: IReservationRepository,
  reservationProjectionRepository: IReservationProjectionRepository,
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

  const validateReservationHandler = new ValidateReservationHandler(
    reservationRepository,
    reservationProjectionRepository,
    projectionHandler,
    eventBus,
  )

  eventBus.subscribe(BOOK_VALIDATION_RESULT, async (event) => {
    try {
      // Also update the write model (reservation aggregate)
      await validateReservationHandler.execute(event, {
        reservationId: event.payload.reservationId,
        isValid: event.payload.isValid,
        reason: event.payload.reason,
      })
    } catch (error) {
      logger.error(`Error handling BookValidationResult event: ${error}`)
    }
  })

  // Cross-service events from the books domain
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

  eventBus.subscribe(BOOK_DELETED, async (event) => {
    try {
      await projectionHandler.handleBookDeleted(event)
    } catch (error) {
      logger.error(`Error handling BookDeleted event: ${error}`)
    }
  })

  logger.info('Reservation event subscriptions configured successfully')
}
