import { DomainEvent } from './DomainEvent.js'

export interface EventStore {
  append(event: DomainEvent): Promise<void>
  load(aggregateId: string): Promise<DomainEvent[]>
}
