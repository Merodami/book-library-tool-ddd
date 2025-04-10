import {
  getPaginatedData,
  MongoDatabaseService,
} from '@book-library-tool/database'
import type { Book, PaginatedBookResponse } from '@book-library-tool/sdk'
import { ApplicationError } from '@book-library-tool/shared/src/errors.js'
import type { Collection } from 'mongodb'

import { GetAllBooksQuery } from '../../../application/use_cases/queries/GetAllBooksQuery.js'

// A mapping function to ensure that your domain model fields match those expected externally.
function mapProjectionToBook(doc: any): Book {
  return {
    isbn: doc.isbn,
    title: doc.title,
    author: doc.author,
    publicationYear: doc.publicationYear,
    publisher: doc.publisher,
    price: doc.price,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  }
}

export class BookProjectionRepository {
  private readonly collection: Collection<Book>

  constructor(private dbService: MongoDatabaseService) {
    this.collection = dbService.getCollection('book_projection')
  }

  async getAllBooks(query: GetAllBooksQuery): Promise<PaginatedBookResponse> {
    const { title, author, publicationYear, limit = 10, page = 1 } = query

    const filter: Record<string, unknown> = {}

    if (title && typeof title === 'string' && title.trim().length > 0) {
      // Use regex for a case-insensitive search in the title field
      filter.title = { $regex: new RegExp(title.trim(), 'i') }
    }

    if (author && typeof author === 'string' && author.trim().length > 0) {
      // Use regex for a case-insensitive search in the author field
      filter.author = { $regex: new RegExp(author.trim(), 'i') }
    }

    if (publicationYear) {
      filter.publicationYear = Number(publicationYear)
    }

    // Use the pagination helper to get paginated books data
    const paginatedBooks = await getPaginatedData<Book>(
      this.dbService,
      this.collection,
      filter,
      { limit, page },
      { projection: { _id: 0 } },
    )

    return paginatedBooks
  }

  async getBookByISBN(isbn: string): Promise<Book | null> {
    const doc = await this.collection.findOne({ isbn })

    if (doc && doc.deletedAt) {
      throw new ApplicationError(
        404,
        'BOOK_NOT_FOUND',
        `Book with ISBN ${isbn} not found.`,
      )
    }

    return doc ? mapProjectionToBook(doc) : null
  }
}
