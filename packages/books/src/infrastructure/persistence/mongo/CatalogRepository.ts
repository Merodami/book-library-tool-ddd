import { Errors } from '@book-library-tool/shared'
import { Book } from '@entities/Book.js'
import { ListBookCommand } from '@commands/ListBookCommand.js'
import {
  getPaginatedData,
  MongoDatabaseService,
} from '@book-library-tool/database'
import { PaginatedResponse } from '@book-library-tool/types'
import { ICatalogRepository } from '@repositories/ICatalogRepository.js'
import { Collection, WithId } from 'mongodb'

export class CatalogRepository implements ICatalogRepository {
  protected readonly collection: Collection<Book>

  constructor(protected readonly dbService: MongoDatabaseService) {
    this.collection = this.dbService.getCollection<Book>('book_projection')
  }

  /**
   * Retrieves all events for the given aggregate ID.
   *
   * @param params - The search parameters for filtering books.
   * @returns An array of DomainEvent objects representing the book events.
   */
  async getAllBooks(
    params: ListBookCommand,
  ): Promise<PaginatedResponse<WithId<Book>>> {
    try {
      const { title, author, publicationYear, limit = 10, page = 1 } = params

      const filter: Record<string, unknown> = {}

      if (title && typeof title === 'string' && title.trim().length > 0) {
        // Use regex for a case-insensitive search in the title field
        filter.title = { $regex: new RegExp(title.trim(), 'i') }
      }

      if (author && typeof author === 'string' && author.trim().length > 0) {
        // Use regex for a case-insensitive search in the author field
        filter.author = { $regex: new RegExp(author.trim(), 'i') }
      }

      if (publicationYear) {
        filter.publicationYear = Number(publicationYear)
      }

      const booksCollection =
        this.dbService.getCollection<Book>('book_projection')

      // Use the pagination helper to get paginated books data
      const paginatedBooks = await getPaginatedData<Book>(
        booksCollection,
        filter,
        { limit, page },
        { projection: { _id: 0 } },
      )

      return paginatedBooks
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error)

      throw new Errors.ApplicationError(
        500,
        'BOOK_LOOKUP_FAILED',
        `Failed to retrieve books: ${msg}`,
      )
    }
  }
}
