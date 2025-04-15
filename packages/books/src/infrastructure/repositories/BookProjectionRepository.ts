import type {
  CatalogSearchQuery,
  PaginatedBookResponse,
} from '@book-library-tool/sdk'
import { Book } from '@book-library-tool/sdk'
import { IBookProjectionRepository } from '@repositories/IBookProjectionRepository.js'
import { Collection, Document } from 'mongodb'
import { ObjectId } from 'mongodb'

const ALLOWED_FIELDS = [
  'title',
  'author',
  'isbn',
  'publicationYear',
  'publisher',
  'price',
] as const
type AllowedField = (typeof ALLOWED_FIELDS)[number]

interface BookProjection {
  _id: ObjectId
  isbn: string
  title: string
  author: string
  publicationYear: number
  publisher: string
  price: number
  deletedAt?: Date
  createdAt?: Date
  updatedAt?: Date
}

interface BookUpdate {
  title?: string
  author?: string
  isbn?: string
  publicationYear?: number
  publisher?: string
  price?: number
}

interface DbQuery {
  title?: { $regex: string; $options: string }
  author?: { $regex: string; $options: string }
  isbn?: string
  publicationYear?: number | { $gte?: number; $lte?: number }
  publisher?: { $regex: string; $options: string }
  price?: number | { $gte?: number; $lte?: number }
  deletedAt?: { $exists: boolean }
}

function mapBookToProjection(book: Book): Omit<BookProjection, '_id'> {
  return {
    isbn: book.isbn,
    title: book.title,
    author: book.author,
    publicationYear: book.publicationYear,
    publisher: book.publisher,
    price: book.price,
    createdAt: book.createdAt ? new Date(book.createdAt) : undefined,
    updatedAt: book.updatedAt ? new Date(book.updatedAt) : undefined,
    deletedAt: book.deletedAt ? new Date(book.deletedAt) : undefined,
  }
}

function mapProjectionToBook(projection: BookProjection): Book {
  return {
    isbn: projection.isbn,
    title: projection.title,
    author: projection.author,
    publicationYear: projection.publicationYear,
    publisher: projection.publisher,
    price: projection.price,
    createdAt: projection.createdAt?.toISOString(),
    updatedAt: projection.updatedAt?.toISOString(),
    deletedAt: projection.deletedAt?.toISOString(),
  }
}

function assertBookProjection(doc: Document): BookProjection {
  if (
    !doc._id ||
    !doc.isbn ||
    !doc.title ||
    !doc.author ||
    !doc.publicationYear ||
    !doc.publisher ||
    !doc.price
  ) {
    throw new Error('Invalid book projection document')
  }
  return doc as BookProjection
}

export class BookProjectionRepository implements IBookProjectionRepository {
  constructor(private readonly collection: Collection<BookProjection>) {}

  private buildTextSearchQuery(query: CatalogSearchQuery): Partial<DbQuery> {
    const textSearch: Partial<DbQuery> = {}
    if (query.title) {
      textSearch.title = { $regex: query.title, $options: 'i' }
    }
    if (query.author) {
      textSearch.author = { $regex: query.author, $options: 'i' }
    }
    if (query.publisher) {
      textSearch.publisher = { $regex: query.publisher, $options: 'i' }
    }
    return textSearch
  }

  private buildRangeQuery(
    field: 'publicationYear' | 'price',
    min?: number,
    max?: number,
    exact?: number,
  ): Partial<DbQuery> {
    if (min || max) {
      const range: { $gte?: number; $lte?: number } = {}
      if (min) range.$gte = min
      if (max) range.$lte = max
      return { [field]: range }
    }
    if (exact) {
      return { [field]: exact }
    }
    return {}
  }

  private buildProjection(fields?: string[]): Partial<Record<AllowedField, 1>> {
    const projection: Partial<Record<AllowedField, 1>> = {}
    if (fields?.length) {
      for (const field of fields) {
        if (ALLOWED_FIELDS.includes(field as AllowedField)) {
          projection[field as AllowedField] = 1
        }
      }
    }
    return projection
  }

  async getAllBooks(
    query: CatalogSearchQuery,
    fields?: string[],
  ): Promise<PaginatedBookResponse> {
    // Build the base query
    const dbQuery: DbQuery = {
      deletedAt: { $exists: false },
      ...this.buildTextSearchQuery(query),
    }

    // Add exact match fields
    if (query.isbn) {
      dbQuery.isbn = query.isbn
    }

    // Add range queries
    Object.assign(
      dbQuery,
      this.buildRangeQuery(
        'publicationYear',
        query.publicationYearMin,
        query.publicationYearMax,
        query.publicationYear,
      ),
    )
    Object.assign(
      dbQuery,
      this.buildRangeQuery(
        'price',
        query.priceMin,
        query.priceMax,
        query.price,
      ),
    )

    // Get total count and calculate pagination
    const total = await this.collection.countDocuments(dbQuery)
    const skip = query.skip || 0
    const limit = query.limit || 10
    const page = Math.floor(skip / limit) + 1
    const pages = Math.ceil(total / limit)

    // Build and execute the query
    const cursor = this.collection
      .find(dbQuery)
      .project(this.buildProjection(fields))
      .skip(skip)
      .limit(limit)

    if (query.sortBy && query.sortOrder) {
      cursor.sort({ [query.sortBy]: query.sortOrder === 'ASC' ? 1 : -1 })
    }

    const books = await cursor.toArray()

    return {
      data: books.map((book) =>
        mapProjectionToBook(assertBookProjection(book)),
      ),
      pagination: {
        total,
        page,
        limit,
        pages,
        hasNext: skip + limit < total,
        hasPrev: skip > 0,
      },
    }
  }

  async getBookByISBN(isbn: string, fields?: string[]): Promise<Book | null> {
    // Build the projection based on requested fields
    const projection: Record<AllowedField, number> = {} as Record<
      AllowedField,
      number
    >
    if (fields && fields.length > 0) {
      for (const field of fields) {
        if (ALLOWED_FIELDS.includes(field as AllowedField)) {
          projection[field as AllowedField] = 1
        }
      }
    }

    const book = await this.collection.findOne({ isbn }, { projection })
    if (!book) return null

    return mapProjectionToBook(assertBookProjection(book))
  }

  async saveProjection(bookProjection: Book): Promise<void> {
    const projection: BookProjection = {
      ...mapBookToProjection(bookProjection),
      _id: new ObjectId(),
    }
    await this.collection.insertOne(projection)
  }

  async updateProjection(id: string, updates: BookUpdate): Promise<void> {
    await this.collection.updateOne(
      { _id: new ObjectId(id) },
      { $set: { ...updates, updatedAt: new Date() } },
    )
  }

  async markAsDeleted(id: string, timestamp: Date): Promise<void> {
    await this.collection.updateOne(
      { _id: new ObjectId(id) },
      { $set: { deletedAt: timestamp } },
    )
  }

  async findBookForReservation(isbn: string): Promise<BookProjection | null> {
    const book = await this.collection.findOne({
      isbn,
      deletedAt: { $exists: false },
    })
    if (!book) return null
    return assertBookProjection(book)
  }
}
