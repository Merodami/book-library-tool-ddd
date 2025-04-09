import type { Collection } from 'mongodb'
import { MongoDatabaseService } from '@book-library-tool/database'
import { Book } from '@book-library-tool/sdk'

// Optionally, if you maintain a mapper from your Domain Book to a DTO:
// You can define your mapping function like so:
export function mapDomainBookToDTO(bookDoc: any): Book {
  return {
    isbn: bookDoc.isbn,
    title: bookDoc.title,
    author: bookDoc.author,
    publicationYear: bookDoc.publicationYear,
    publisher: bookDoc.publisher,
    price: bookDoc.price,
    createdAt: bookDoc.createdAt, // assuming these are already ISO strings
    updatedAt: bookDoc.updatedAt,
    // Add any other fields as required.
  }
}

export class BookProjectionRepository {
  private readonly collection: Collection

  constructor(private readonly dbService: MongoDatabaseService) {
    // This collection is your read-model collection that is updated asynchronously.
    this.collection = this.dbService.getCollection('book_projection')
  }

  /**
   * Retrieves all books from the projection.
   */
  async getAllBooks(): Promise<Book[]> {
    // Query the read model collection.
    const docs = await this.collection.find({}).toArray()

    // Map each document to the DTO expected by the external API.
    return docs.map((doc) => mapDomainBookToDTO(doc))
  }
}
