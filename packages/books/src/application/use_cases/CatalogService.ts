import { CatalogSearchQuery } from '@book-library-tool/sdk'
import { Errors } from '@book-library-tool/shared'
import { PaginatedResponse } from '@book-library-tool/types'
import { ICatalogRepository } from '@repositories/ICatalogRepository.js'
import { WithId } from 'mongodb'
import { Book } from '@entities/Book.js'

export class CatalogService {
  constructor(private readonly catalogRepository: ICatalogRepository) {}

  /**
   * Retrieves all books from the repository.
   * This method is useful for listing all available books.
   *
   * @returns An array of Book aggregates.
   */
  async getAllBooks(
    params: CatalogSearchQuery,
  ): Promise<PaginatedResponse<WithId<Book>>> {
    // Retrieve all events for the given aggregate ID.
    const books = await this.catalogRepository.getAllBooks(params)
    console.log('🚀 ~ CatalogService ~ books:', books)

    if (!books || books.data.length === 0) {
      throw new Errors.ApplicationError(
        404,
        'BOOK_NOT_FOUND',
        `No books found.`,
      )
    }

    return books
  }
}
