import { IBaseReadEventSourcedRepository } from '@book-library-tool/database'
import type { DomainEvent } from '@book-library-tool/event-store'
import type { Book } from '@books/domain/index.js'

/**
 * IBookReadRepository abstracts the persistence and retrieval of domain events
 * for Book aggregates. It ensures optimistic concurrency via version checking.
 */
export interface IBookReadRepository
  extends IBaseReadEventSourcedRepository<Book> {
  /**
   * Retrieves all the domain events for a specific aggregate, ordered by version.
   *
   * @param aggregateId - The unique identifier of the Book aggregate.
   * @returns A promise that resolves to an array of DomainEvent objects.
   */
  getEventsForAggregate(aggregateId: string): Promise<DomainEvent[]>

  /**
   * Finds the aggregate ID associated with an ID
   */
  findAggregateIdById(id: string): Promise<string | null>
}
