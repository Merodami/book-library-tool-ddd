/**
 * Query for retrieving books with optional search parameters.
 */
export interface GetAllBooksQuery {
  title?: string
  author?: string
  publicationYear?: number
  page?: number
  limit?: number
}
