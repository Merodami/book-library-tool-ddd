export interface DomainEvent {
  aggregateId: string
  eventType: string
  payload: any
  timestamp: Date
  version: number
}
