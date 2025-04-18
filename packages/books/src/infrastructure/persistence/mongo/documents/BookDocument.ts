import { ObjectId } from 'mongodb'

/**
 * Database document representation of a book with MongoDB native types
 * This is what's actually stored in the database (with Date objects)
 */
export interface BookDocument {
  _id: ObjectId
  isbn: string
  title: string
  author: string
  publicationYear: number
  publisher: string
  price: number
  createdAt: Date
  updatedAt: Date
  deletedAt?: Date
}
