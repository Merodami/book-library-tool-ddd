import { MongoReadRepositoryPort } from '@book-library-tool/database'
import type { DomainEvent } from '@book-library-tool/shared'
import type { Book } from '@books/domain/index.js'

/**
 * BookReadRepository abstracts the persistence and retrieval of domain events
 * for Book aggregates. It ensures optimistic concurrency via version checking.
 */
export interface BookReadRepositoryPort extends MongoReadRepositoryPort<Book> {
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

  /**
   * Retrieves a Book by its unique identifier.
   *
   * @param aggregateId - The unique identifier of the Book aggregate.
   * @returns A promise that resolves to a Book object or null if not found.
   */
  getById(aggregateId: string): Promise<Book | null>
}
