import { AggregateRoot } from '@event-store/model/AggregateRoot.js'
import { Collection } from 'mongodb'

import { DomainEvent } from '../../../domain/events/DomainEvent.js'
import { BaseEventSourcedRepository } from './BaseEventSourcedRepository.js'

export abstract class BaseReadEventSourcedRepository<
  T extends AggregateRoot,
> extends BaseEventSourcedRepository<T> {
  constructor(protected readonly collection: Collection<DomainEvent>) {
    super(collection)
  }

  /**
   * Retrieves and rehydrates an aggregate by its ID.
   *
   * @param aggregateId Aggregate identifier.
   * @returns The rehydrated aggregate or null if not found.
   */
  async getById(aggregateId: string): Promise<T | null> {
    const events = await this.getEventsForAggregate(aggregateId)

    if (events.length === 0) {
      return null
    }

    return this.rehydrateFromEvents(events)
  }
}
