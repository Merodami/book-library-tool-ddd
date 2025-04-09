export interface EventMetadata {
  correlationId?: string
  causationId?: string
  userId?: string
  timestamp?: Date
  stored?: Date
  [key: string]: any // Allow for additional metadata properties
}

export interface DomainEvent {
  aggregateId: string
  eventType: string
  version: number
  schemaVersion: number
  timestamp: Date
  payload: any
  metadata?: EventMetadata // Add the metadata field here
}
