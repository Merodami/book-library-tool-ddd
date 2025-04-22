/**
 * Database document representation of a book with MongoDB native types
 */
export interface BookDocument {
  id?: string
  isbn?: string
  title?: string
  author?: string
  publicationYear?: number
  publisher?: string
  price?: number
  version?: number
  createdAt: Date
  updatedAt?: Date | null
  deletedAt?: Date | null
}
