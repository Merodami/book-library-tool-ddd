import { ObjectId } from 'mongodb'

/**
 * Database document representation of a book with MongoDB native types
 */
export interface BookDocument {
  _id: ObjectId
  id: string
  isbn: string
  title: string
  author: string
  publicationYear: number
  publisher: string
  price: number
  version: number
  createdAt: Date
  updatedAt?: Date | null
  deletedAt?: Date | null
}
