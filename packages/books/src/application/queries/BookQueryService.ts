import { Book } from '@book-library-tool/sdk'
import { BookProjectionRepository } from '@event-store/BookProjectionRepository.js'

export class BookQueryService {
  constructor(
    private readonly projectionRepository: BookProjectionRepository,
  ) {}

  /**
   * Returns all books by querying the projection.
   */
  async getAllBooks(): Promise<Book[]> {
    return this.projectionRepository.getAllBooks()
  }
}
