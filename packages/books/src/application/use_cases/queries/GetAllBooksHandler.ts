import { schemas } from '@book-library-tool/api'
import { ErrorCode, Errors, logger } from '@book-library-tool/shared'
import { IBookReadProjectionRepository } from '@books/repositories/IBookReadProjectionRepository.js'

export class GetAllBooksHandler {
  constructor(
    private readonly projectionReadRepository: IBookReadProjectionRepository,
  ) {}

  /**
   * Retrieves all books from the repository.
   * This method is useful for listing all available books.
   *
   * @param query - The search query parameters
   * @param fields - Optional array of fields to return
   * @returns A paginated response of Book objects
   */
  async execute(
    query: schemas.CatalogSearchQuery,
    fields?: schemas.BookSortField[],
  ): Promise<schemas.PaginatedResult<schemas.Book>> {
    try {
      // Retrieve all events for the given aggregate ID.
      const books = await this.projectionReadRepository.getAllBooks(
        query,
        fields,
      )

      if (!books) {
        return {
          data: [],
          pagination: {
            total: 0,
            page: query.page || 1,
            limit: query.limit || 10,
            pages: 0,
            hasNext: false,
            hasPrev: false,
          },
        }
      }

      return books
    } catch (err) {
      logger.error('Error retrieving books catalog:', err)

      throw new Errors.ApplicationError(
        500,
        ErrorCode.INTERNAL_ERROR,
        'Error retrieving books catalog',
      )
    }
  }
}
