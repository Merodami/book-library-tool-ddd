import { Book } from '@entities/Book.js'
import { IBookRepository } from '@repositories/IBookRepository.js'
import { MongoDatabaseService } from '@book-library-tool/database'
import { Collection } from 'mongodb'

export class BookRepository implements IBookRepository {
  constructor(private readonly dbService: MongoDatabaseService) {}

  async create(book: Book): Promise<void> {
    const collection = this.dbService.getCollection<Book>('books')

    await collection.insertOne(book)
  }

  async findByISBN(isbn: Book['isbn']): Promise<Book | null> {
    const collection: Collection<Book> =
      this.dbService.getCollection<Book>('books')

    const book = await collection.findOne({ isbn })

    if (!book) return null

    return Book.rehydrate({
      isbn: book.isbn,
      title: book.title,
      author: book.author,
      publicationYear: book.publicationYear,
      publisher: book.publisher,
      price: book.price,
      createdAt:
        book.createdAt instanceof Date
          ? book.createdAt.toISOString()
          : book.createdAt,
      updatedAt:
        book.updatedAt instanceof Date
          ? book.updatedAt.toISOString()
          : book.updatedAt,
      deletedAt: book.deletedAt
        ? book.deletedAt instanceof Date
          ? book.deletedAt.toISOString()
          : book.deletedAt
        : undefined,
    })
  }

  async deleteByISBN(isbn: Book['isbn']): Promise<boolean> {
    const collection = this.dbService.getCollection<Book>('books')

    const result = await collection.deleteOne({ isbn })

    return result.deletedCount === 1
  }
}
