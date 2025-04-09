import {
  BOOK_CREATED,
  BOOK_DELETED,
  BOOK_UPDATED,
  EventBus,
} from '@book-library-tool/event-store'
import { BookProjectionHandler } from '@event-store/BookProjectionHandler.js'

// import { NotificationService } from '../services/NotificationService'
// import { InventoryService } from '../../application/services/InventoryService'
// import { LoggingService } from '../services/LoggingService'

export function setupEventSubscriptions(
  eventBus: EventBus,
  bookProjectionHandler: BookProjectionHandler,
  //   notificationService: NotificationService,
  //   inventoryService: InventoryService,
  //   loggingService: LoggingService,
): void {
  // Projection handlers
  eventBus.subscribe(
    BOOK_CREATED,
    bookProjectionHandler.handleBookCreated.bind(bookProjectionHandler),
  )
  eventBus.subscribe(
    BOOK_UPDATED,
    bookProjectionHandler.handleBookUpdated.bind(bookProjectionHandler),
  )
  eventBus.subscribe(
    BOOK_DELETED,
    bookProjectionHandler.handleBookDeleted.bind(bookProjectionHandler),
  )

  // Notification handlers
  //   eventBus.subscribe(
  //     BOOK_CREATED,
  //     notificationService.notifyNewBook.bind(notificationService),
  //   )

  //   // Inventory management
  //   eventBus.subscribe(
  //     'ReservationCreated',
  //     inventoryService.decrementAvailableCount.bind(inventoryService),
  //   )
  //   eventBus.subscribe(
  //     'ReservationReturned',
  //     inventoryService.incrementAvailableCount.bind(inventoryService),
  //   )

  // Audit logging for all events
  //   eventBus.subscribeToAll(loggingService.logEvent.bind(loggingService))
}
