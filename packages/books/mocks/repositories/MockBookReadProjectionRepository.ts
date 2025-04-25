import { schemas } from '@book-library-tool/api'
import {
  BookField,
  BookFieldEnum,
  BookSortField,
  BookSortFieldEnum,
} from '@book-library-tool/sdk'
import { type PaginatedResult } from '@book-library-tool/types'
import { GetBookQuery } from '@books/application/use_cases/queries/GetBookQuery.js'
import { DomainBook } from '@books/domain/index.js'
import type { IBookReadProjectionRepository } from '@books/domain/repositories/IBookReadProjectionRepository.js'
import { type BookDocument } from '@books/infrastructure/persistence/mongo/documents/BookDocument.js'
import { get, pick } from 'lodash-es'
import { type Filter } from 'mongodb'
import { vi } from 'vitest'

/**
 * Sample books for testing. You can customize this as needed.
 */
const sampleBooks: DomainBook[] = [
  {
    id: '5a1018f2-3526-4275-a84b-784e4f2e5a10',
    isbn: '978-3-16-148410-0',
    title: 'Book One',
    author: 'Author One',
    publicationYear: 2023,
    publisher: 'Publisher A',
    price: 19.99,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: '5a1018f2-3526-4275-a84b-784e4f2e5a11',
    isbn: '978-3-16-148410-1',
    title: 'Second Book',
    author: 'Author Two',
    publicationYear: 2024,
    publisher: 'Publisher B',
    price: 29.99,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
]

/**
 * Creates a mock implementation of IBookReadProjectionRepository for testing.
 * This can be reused across different test files.
 *
 * @param initialBooks - Optional array of book data to use instead of the default sampleBooks
 * @returns A mock repository that implements IBookReadProjectionRepository
 */
export function createMockBookReadProjectionRepository(
  initialBooks?: DomainBook[],
): IBookReadProjectionRepository {
  const books = initialBooks || sampleBooks

  return {
    /**
     * Mocked getAllBooks: filters by text, numeric ranges, sorting, pagination, and field projection.
     */
    getAllBooks: vi
      .fn()
      .mockImplementation(
        async (
          query: schemas.CatalogSearchQuery,
          fields?: BookSortField[],
        ): Promise<schemas.PaginatedResult<DomainBook>> => {
          let filtered = books

          // Text-based filters on title, author, publisher
          for (const key of ['title', 'author', 'publisher'] as const) {
            if (get(query, key)) {
              filtered = filtered.filter((b) =>
                get(b, key, '')
                  .toString()
                  .toLowerCase()
                  .includes((get(query, key) as string).toLowerCase()),
              )
            }
          }

          // Exact ISBN match
          if (query.isbn) {
            filtered = filtered.filter((b) => b.isbn === query.isbn)
          }

          // Numeric range filters for publicationYear and price
          for (const field of ['publicationYear', 'price'] as const) {
            const exact = get(query, field)
            const min = get(query, `${field}Min`)
            const max = get(query, `${field}Max`)

            if (exact !== undefined) {
              filtered = filtered.filter((b) => get(b, field) === Number(exact))
            }
            if (min !== undefined) {
              filtered = filtered.filter((b) => get(b, field)! >= Number(min))
            }
            if (max !== undefined) {
              filtered = filtered.filter((b) => get(b, field)! <= Number(max))
            }
          }

          // Sorting
          if (query.sortBy && query.sortOrder) {
            const dir = query.sortOrder.toLowerCase() === 'desc' ? -1 : 1

            filtered = filtered.sort((a, b) => {
              const aVal = get(a, query.sortBy!)
              const bVal = get(b, query.sortBy!)

              if (aVal == null || bVal == null) return 0
              if (typeof aVal === 'string' && typeof bVal === 'string') {
                return aVal.localeCompare(bVal) * dir
              }

              return (Number(aVal) - Number(bVal)) * dir
            })
          }

          // Pagination
          const page =
            typeof query.page === 'string'
              ? parseInt(query.page, 10)
              : (query.page ?? 1)
          const limit =
            typeof query.limit === 'string'
              ? parseInt(query.limit, 10)
              : (query.limit ?? 10)
          const total = filtered.length
          const start = (page - 1) * limit
          const pageData = filtered.slice(start, start + limit)

          // Field projection: only include allowed fields
          const data =
            fields && fields.length
              ? pageData.map((book) => {
                  const validFields = fields.filter((f) =>
                    Object.values(BookSortFieldEnum).includes(
                      f as BookSortField,
                    ),
                  ) as BookSortField[]

                  // Split fields into regular fields and date fields
                  const regularFields = validFields.filter(
                    (f) => !['createdAt', 'updatedAt', 'deletedAt'].includes(f),
                  ) as (keyof Pick<
                    DomainBook,
                    | 'id'
                    | 'title'
                    | 'author'
                    | 'isbn'
                    | 'publicationYear'
                    | 'publisher'
                    | 'price'
                  >)[]
                  const dateFields = validFields.filter((f) =>
                    ['createdAt', 'updatedAt', 'deletedAt'].includes(f),
                  ) as ('createdAt' | 'updatedAt' | 'deletedAt')[]

                  const picked = pick(
                    book,
                    regularFields as string[],
                  ) as Partial<DomainBook>

                  // Add date fields separately to maintain Date type
                  if (dateFields.includes('createdAt'))
                    picked.createdAt = book.createdAt
                  if (dateFields.includes('updatedAt'))
                    picked.updatedAt = book.updatedAt
                  if (dateFields.includes('deletedAt'))
                    picked.deletedAt = book.deletedAt

                  return picked as DomainBook
                })
              : pageData

          return {
            data,
            pagination: {
              total,
              page,
              limit,
              pages: Math.ceil(total / limit),
              hasNext: page * limit < total,
              hasPrev: page > 1,
            },
          }
        },
      ),

    /**
     * Mocked getBookById: finds a book by ID and optionally projects fields.
     */
    getBookById: vi
      .fn()
      .mockImplementation(
        async (
          query: GetBookQuery,
          fields?: BookSortField[],
        ): Promise<DomainBook | null> => {
          const book = books.find((b) => b.id === query.id)

          if (!book) return null

          if (fields && fields.length) {
            const validFields = fields.filter((f) =>
              Object.values(BookFieldEnum).includes(f as unknown as BookField),
            )

            return pick(book, validFields) as DomainBook
          }

          return book
        },
      ),

    /**
     * Mocked getBookByIsbn: finds a book by ISBN and optionally projects fields.
     */
    getBookByIsbn: vi
      .fn()
      .mockImplementation(
        async (
          isbn: string,
          fields?: BookSortField[][],
        ): Promise<DomainBook | null> => {
          const book = books.find((b) => b.isbn === isbn)

          if (!book) return null
          if (fields && fields.length) {
            const validFields = fields.filter((f) =>
              Object.values(BookFieldEnum).includes(f as unknown as BookField),
            )

            return pick(book, validFields) as DomainBook
          }

          return book
        },
      ),

    /**
     * Mocked findOne: finds a single book by filter.
     */
    findOne: vi
      .fn()
      .mockImplementation(
        async (
          filter: Filter<BookDocument>,
          fields?: string[] | unknown,
          errorContext?: string,
        ): Promise<DomainBook | null> => {
          const book = books.find((b) => b.id === filter.id)

          return book || null
        },
      ),

    /**
     * Mocked findMany: finds multiple books with pagination.
     */
    findMany: vi.fn().mockImplementation(
      async (
        filter: Filter<BookDocument>,
        options: {
          skip?: number
          limit?: number
          sortBy?: string
          sortOrder?: 'asc' | 'desc'
          fields?: string[] | unknown
        },
      ): Promise<DomainBook[]> => {
        return books
      },
    ),

    /**
     * Mocked count: counts books matching a filter.
     */
    count: vi
      .fn()
      .mockImplementation(
        async (filter: Filter<BookDocument>): Promise<number> => {
          return books.length
        },
      ),

    /**
     * Mocked executePaginatedQuery: executes a paginated query.
     */
    executePaginatedQuery: vi.fn().mockImplementation(
      async <
        T extends {
          page?: number
          limit?: number
          skip?: number
          sortBy?: string
          sortOrder?: 'asc' | 'desc'
        },
      >(
        filter: Filter<BookDocument>,
        queryParams: T,
        fields?: string[] | unknown,
      ): Promise<PaginatedResult<DomainBook>> => {
        const page = queryParams.page || 1
        const limit = queryParams.limit || 10
        const start = (page - 1) * limit
        const end = start + limit
        const data = books.slice(start, end)

        return {
          data,
          pagination: {
            total: books.length,
            page,
            limit,
            pages: Math.ceil(books.length / limit),
            hasNext: end < books.length,
            hasPrev: page > 1,
          },
        }
      },
    ),
  }
}

/**
 * Helper to reset all mock functions on a repository.
 * Call this in beforeEach() to clear call history and return fresh spies.
 *
 * @param repository - The mocked repository to reset
 */
export function resetMockBookReadProjectionRepository(
  repository: IBookReadProjectionRepository,
): void {
  Object.values(repository).forEach((fn) => {
    if (typeof fn === 'function' && 'mockClear' in fn) {
      fn.mockClear()
    }
  })
}
