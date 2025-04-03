import { DatabaseService } from '@book-library-tool/database'
import { Book } from '../../../../domain/src/books/entities/Book.js'
import { IBookRepository } from '../../../../domain/src/books/repositories/BookRepository.js'

export class MongoBookRepository implements IBookRepository {
  constructor(private readonly dbService: IDatabaseService) {}

  async findById(id: string): Promise<Book | null> {
    const collection = this.dbService.getCollection<Book>('books')
    const doc = await collection.findOne({ id })
    if (!doc) return null

    return new Book(
      doc.id,
      doc.title,
      doc.author,
      doc.publicationYear,
      doc.publisher,
      doc.price,
      new Date(doc.createdAt),
      new Date(doc.updatedAt),
    )
  }

  async create(book: Book): Promise<void> {
    const collection = DatabaseService.getCollection<Book>('books')
    // Use the insertDocument helper to add timestamps automatically.
    await DatabaseService.insertDocument(collection, {
      id: book.id,
      title: book.title,
      author: book.author,
      publicationYear: book.publicationYear,
      publisher: book.publisher,
      price: book.price,
    })
  }

  async deleteById(id: string): Promise<boolean> {
    const collection = DatabaseService.getCollection<Book>('books')
    const result = await collection.deleteOne({ id })
    return result.deletedCount === 1
  }
}

import { IBookRepository } from '@book-library-tool/domain/src/books/BookRepository'
import { Book } from '@book-library-tool/domain/src/books/Book'
import { IDatabaseService } from '../database/IDatabaseService'

export class MongoBookRepository implements IBookRepository {
  constructor(private readonly dbService: IDatabaseService) {}

  async findById(id: string): Promise<Book | null> {
    const collection = this.dbService.getCollection<Book>('books')
    const doc = await collection.findOne({ id })
    if (!doc) return null

    return new Book(
      doc.id,
      doc.title,
      doc.author,
      doc.publicationYear,
      doc.publisher,
      doc.price,
      new Date(doc.createdAt),
      new Date(doc.updatedAt),
    )
  }

  async create(book: Book): Promise<void> {
    const collection = this.dbService.getCollection<Book>('books')
    await collection.insertOne({
      id: book.id,
      title: book.title,
      author: book.author,
      publicationYear: book.publicationYear,
      publisher: book.publisher,
      price: book.price,
      createdAt: book.createdAt.toISOString(),
      updatedAt: book.updatedAt.toISOString(),
    })
  }

  async deleteById(id: string): Promise<boolean> {
    const collection = this.dbService.getCollection<Book>('books')
    const result = await collection.deleteOne({ id })
    return result.deletedCount === 1
  }
}
