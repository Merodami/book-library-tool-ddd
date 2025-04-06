import { Book } from '../../../domain/entities/Book.js'
import { IBookRepository } from '../../../domain/repositories/IBookRepository.js'
import { IDatabaseService } from '../../database/IDatabaseService.js'

export class BookRepository implements IBookRepository {
  constructor(private readonly dbService: IDatabaseService) {}

  async findByISBN(isbn: Book['isbn']): Promise<Book | null> {
    const collection = this.dbService.getCollection<Book>('books')

    const book = await collection.findOne({ isbn })

    if (!book) return null

    return new Book(
      book.isbn,
      book.title,
      book.author,
      book.publicationYear,
      book.publisher,
      book.price,
      new Date(book.createdAt),
      new Date(book.updatedAt),
    )
  }

  async create(book: Book): Promise<void> {
    const collection = this.dbService.getCollection<Book>('books')

    await collection.insertOne(book)
  }

  async deleteByISBN(isbn: Book['isbn']): Promise<boolean> {
    const collection = this.dbService.getCollection<Book>('books')

    const result = await collection.deleteOne({ isbn })

    return result.deletedCount === 1
  }
}
