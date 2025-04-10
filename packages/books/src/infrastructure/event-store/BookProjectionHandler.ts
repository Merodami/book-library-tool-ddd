import { MongoDatabaseService } from '@book-library-tool/database'
import { DomainEvent } from '@book-library-tool/event-store'

const BOOK_PROJECTION_TABLE = 'book_projection'

export class BookProjectionHandler {
  constructor(private readonly db: MongoDatabaseService) {}

  async handleBookCreated(event: DomainEvent): Promise<void> {
    await this.db.getCollection(BOOK_PROJECTION_TABLE).insertOne({
      id: event.aggregateId,
      isbn: event.payload.isbn,
      title: event.payload.title,
      author: event.payload.author,
      publicationYear: event.payload.publicationYear,
      publisher: event.payload.publisher,
      price: event.payload.price,
      version: event.version,
      updatedAt: new Date(event.timestamp),
    })
  }

  async handleBookUpdated(event: DomainEvent): Promise<void> {
    const updates: any = {}

    if (event.payload.updated.title) updates.title = event.payload.updated.title

    if (event.payload.updated.author)
      updates.author = event.payload.updated.author

    if (event.payload.updated.publicationYear)
      updates.publicationYear = event.payload.updated.publicationYear

    if (event.payload.updated.publisher)
      updates.publisher = event.payload.updated.publisher

    if (event.payload.updated.price) updates.price = event.payload.updated.price

    if (event.payload.updated.isbn) updates.isbn = event.payload.updated.isbn

    await this.db.getCollection(BOOK_PROJECTION_TABLE).updateOne(
      {
        id: event.aggregateId,
        version: { $lt: event.version },
      },
      {
        $set: {
          ...updates,
          version: event.version,
          updatedAt: new Date(event.timestamp),
        },
      },
    )
  }

  async handleBookDeleted(event: DomainEvent): Promise<void> {
    await this.db.getCollection(BOOK_PROJECTION_TABLE).updateOne(
      { id: event.aggregateId },
      {
        $set: {
          deletedAt: new Date(),
          version: event.version,
          updatedAt: new Date(event.timestamp),
        },
      },
    )
  }
}
