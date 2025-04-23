/**
 * Query for retrieving books with optional search parameters.
 */
export interface GetAllBooksQuery {
  /** The title of the book to search for. */
  title?: string

  /** The author of the book to search for. */
  author?: string

  /** The publication year of the book to search for. */
  publicationYear?: number

  /** The page number to search for. */
  page?: number

  /** The limit of the books to search for. */
  limit?: number
}
