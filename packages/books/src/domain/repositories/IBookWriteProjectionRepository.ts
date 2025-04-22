import { schemas } from '@book-library-tool/api'

/**
 * IBookWriteProjectionRepository abstracts the persistence and retrieval of book projections
 * for Book aggregates. It ensures optimistic concurrency via version checking.
 */
export interface IBookWriteProjectionRepository {
  /**
   * Save a new book projection.
   *
   * @param bookProjection - The book projection to save
   */
  saveBookProjection(bookProjection: schemas.Book): Promise<void>

  /**
   * Partially update the projection for a given book ID.
   * @param id - aggregate/book ID
   * @param changes - only the fields you want to modify
   * @param updatedAt - when this change happened
   */
  updateBookProjection(
    id: string,
    changes: Partial<
      Pick<
        schemas.Book,
        'title' | 'author' | 'publicationYear' | 'publisher' | 'price' | 'isbn'
      >
    >,
    updatedAt: Date | string,
  ): Promise<void>

  /**
   * Mark a book as deleted.
   *
   * @param id - The ID of the book to mark as deleted
   * @param timestamp - The timestamp of the deletion
   */
  markAsDeleted(id: string, timestamp: Date): Promise<void>
}
