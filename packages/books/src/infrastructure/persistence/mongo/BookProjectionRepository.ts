import type { Collection } from 'mongodb'
import { MongoDatabaseService } from '@book-library-tool/database'
import type { Book } from '@book-library-tool/sdk'

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
  private readonly collection: Collection

  constructor(dbService: MongoDatabaseService) {
    this.collection = dbService.getCollection('book_projections')
  }

  async getAllBooks(): Promise<Book[]> {
    const docs = await this.collection.find({}).toArray()

    return docs.map(mapProjectionToBook)
  }

  async getBookByISBN(isbn: string): Promise<Book | null> {
    const doc = await this.collection.findOne({ isbn })

    return doc ? mapProjectionToBook(doc) : null
  }
}
