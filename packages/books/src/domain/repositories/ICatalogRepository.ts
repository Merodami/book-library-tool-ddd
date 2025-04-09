import { PaginatedResponse } from '@book-library-tool/types'
import { ListBookCommand } from '@commands/ListBookCommand.js'
import { WithId } from 'mongodb'
import { Book } from '@entities/Book.js'

/**
 * ICatalogRepository abstracts the persistence and retrieval of domain events
 * for Book aggregates. It ensures optimistic concurrency via version checking.
 */
export interface ICatalogRepository {
  /**
   * Retrieves all domain events for a given aggregate, ordered by version.
   * This method is useful for rehydrating the aggregate's state.
   *
   * @param params - The search parameters for the catalog.
   * @returns A promise that resolves to an array of DomainEvent objects.
   */
  getAllBooks(params: ListBookCommand): Promise<PaginatedResponse<WithId<Book>>>
}
