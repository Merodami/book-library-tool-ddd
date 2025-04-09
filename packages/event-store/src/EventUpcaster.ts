import { DomainEvent } from './domain/DomainEvent.js'

export class EventUpcaster {
  upcast(event: DomainEvent): DomainEvent {
    // Different logic based on event type and schema version
    if (event.eventType === 'BookCreated' && event.schemaVersion === 1) {
      //   return this.upcastBookCreatedV1toV2(event)
    }

    // Default: return the event unchanged
    return event
  }

  private upcastBookCreatedV1toV2(event: DomainEvent): DomainEvent {
    // Create a new event with the updated schema
    return {
      ...event,
      schemaVersion: 2,
      payload: {
        ...event.payload,
        // Add the new field with a default value
        category: 'Unknown',
      },
    }
  }
}
