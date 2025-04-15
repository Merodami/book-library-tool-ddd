import { DomainEvent } from '@event-store/events/DomainEvent.js'

/**
 * Creates a standardized error response event when event processing fails.
 *
 * @param originalEvent - The event that failed processing
 * @param error - The error that occurred
 * @param eventType - The type of error event to create (defaults to the original event type with 'Failed' suffix)
 * @returns A standardized error event
 */
export function createErrorEvent(
  originalEvent: DomainEvent,
  error: Error,
  eventType?: string,
): DomainEvent {
  const errorEventType = eventType || `${originalEvent.eventType}_FAILED`

  return {
    eventType: errorEventType,
    aggregateId: originalEvent.aggregateId,
    payload: {
      originalEventType: originalEvent.eventType,
      originalEventId: originalEvent.aggregateId,
      originalPayload: originalEvent.payload,
      error: {
        message: error.message,
        name: error.name,
        stack:
          process.env.ENVIRONMENT === 'development' ? error.stack : undefined,
      },
      timestamp: new Date().toISOString(),
    },
    timestamp: new Date(),
    version: 1,
    schemaVersion: 1,
    metadata: {
      ...originalEvent.metadata,
      isErrorEvent: true,
      correlationId: originalEvent.metadata?.correlationId,
    },
  }
}
