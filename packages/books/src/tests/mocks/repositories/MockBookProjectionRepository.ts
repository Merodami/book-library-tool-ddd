import { schemas } from '@book-library-tool/api'
import { IBookProjectionRepository } from '@books/repositories/IBookProjectionRepository.js'
import { pick } from 'lodash-es'
import { vi } from 'vitest'

/**
 * Sample books for testing. You can customize this as needed.
 */
export const sampleBooks: schemas.Book[] = [
  {
    id: '5a1018f2-3526-4275-a84b-784e4f2e5a10',
    isbn: '978-3-16-148410-0',
    title: 'Book One',
    author: 'Author One',
    publicationYear: 2023,
    publisher: 'Publisher A',
    price: 19.99,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: '5a1018f2-3526-4275-a84b-784e4f2e5a11',
    isbn: '978-3-16-148410-1',
    title: 'Book Two',
    author: 'Author Two',
    publicationYear: 2024,
    publisher: 'Publisher B',
    price: 29.99,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: '5a1018f2-3526-4275-a84b-784e4f2e5a12',
    isbn: '978-3-16-148410-2',
    title: 'Book Three',
    author: 'Author Three',
    publicationYear: 2022,
    publisher: 'Publisher C',
    price: 15.99,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
]

/**
 * Creates a mock implementation of IBookProjectionRepository for testing.
 * This can be reused across different test files.
 *
 * @param customBooks - Optional array of book data to override the default sample books
 * @returns A mock repository that implements IBookProjectionRepository
 */
export function createMockBookProjectionRepository(
  customBooks?: schemas.Book[],
): IBookProjectionRepository {
  const books = customBooks || sampleBooks

  return {
    getAllBooks: vi
      .fn()
      .mockImplementation(
        async (
          query: schemas.CatalogSearchQuery,
          fields?: schemas.BookField[],
        ) => {
          let filteredBooks = [...books]

          // Apply filtering if specified
          if (query.title) {
            filteredBooks = filteredBooks.filter((book) =>
              book.title?.toLowerCase().includes(query.title!.toLowerCase()),
            )
          }

          if (query.author) {
            filteredBooks = filteredBooks.filter((book) =>
              book.author?.toLowerCase().includes(query.author!.toLowerCase()),
            )
          }

          if (query.publisher) {
            filteredBooks = filteredBooks.filter((book) =>
              book.publisher
                ?.toLowerCase()
                .includes(query.publisher!.toLowerCase()),
            )
          }

          if (query.isbn) {
            filteredBooks = filteredBooks.filter(
              (book) => book.isbn === query.isbn,
            )
          }

          if (query.publicationYear) {
            filteredBooks = filteredBooks.filter(
              (book) => book.publicationYear === Number(query.publicationYear),
            )
          }

          if (query.publicationYearMin) {
            filteredBooks = filteredBooks.filter(
              (book) =>
                book.publicationYear &&
                book.publicationYear >= Number(query.publicationYearMin),
            )
          }

          if (query.publicationYearMax) {
            filteredBooks = filteredBooks.filter(
              (book) =>
                book.publicationYear &&
                book.publicationYear <= Number(query.publicationYearMax),
            )
          }

          if (query.price) {
            filteredBooks = filteredBooks.filter(
              (book) => book.price === Number(query.price),
            )
          }

          if (query.priceMin) {
            filteredBooks = filteredBooks.filter(
              (book) => book.price && book.price >= Number(query.priceMin),
            )
          }

          if (query.priceMax) {
            filteredBooks = filteredBooks.filter(
              (book) => book.price && book.price <= Number(query.priceMax),
            )
          }

          // Apply sorting if specified
          if (query.sortBy && query.sortOrder) {
            filteredBooks.sort((a, b) => {
              const fieldA = a[query.sortBy as keyof schemas.Book]
              const fieldB = b[query.sortBy as keyof schemas.Book]

              if (fieldA === undefined || fieldB === undefined) {
                return 0
              }

              if (typeof fieldA === 'string' && typeof fieldB === 'string') {
                return query.sortOrder === 'asc'
                  ? fieldA.localeCompare(fieldB)
                  : fieldB.localeCompare(fieldA)
              }

              if (typeof fieldA === 'number' && typeof fieldB === 'number') {
                return query.sortOrder === 'asc'
                  ? fieldA - fieldB
                  : fieldB - fieldA
              }

              return 0
            })
          }

          // Apply pagination
          const page =
            typeof query.page === 'string'
              ? parseInt(query.page, 10)
              : query.page || 1
          const limit =
            typeof query.limit === 'string'
              ? parseInt(query.limit, 10)
              : query.limit || 10
          const skip = (page - 1) * limit

          const paginatedBooks = filteredBooks.slice(skip, skip + limit)

          // Apply field filtering if specified
          let resultBooks = paginatedBooks

          if (fields && fields.length > 0) {
            resultBooks = paginatedBooks.map((book) => {
              const validFields = fields.filter((field) =>
                schemas.ALLOWED_BOOK_FIELDS.includes(
                  field as schemas.BookField,
                ),
              )

              return pick(book, validFields) as schemas.Book
            })
          }

          const mockPaginatedResponse: schemas.PaginatedResult<schemas.Book> = {
            data: resultBooks,
            pagination: {
              total: filteredBooks.length,
              page: page,
              limit: limit,
              pages: Math.ceil(filteredBooks.length / limit),
              hasNext: skip + limit < filteredBooks.length,
              hasPrev: page > 1,
            },
          }

          return mockPaginatedResponse
        },
      ),

    getBookById: vi
      .fn()
      .mockImplementation(async (id: string, fields?: string[]) => {
        const book = books.find((b) => b.id === id)

        if (!book) return null

        if (fields && fields.length > 0) {
          const validFields = fields.filter((field) =>
            schemas.ALLOWED_BOOK_FIELDS.includes(field as schemas.BookField),
          )

          return pick(book, validFields) as schemas.Book
        }

        return book
      }),

    getBookByIsbn: vi
      .fn()
      .mockImplementation(async (isbn: string, fields?: string[]) => {
        const book = books.find((b) => b.isbn === isbn)

        if (!book) return null

        if (fields && fields.length > 0) {
          const validFields = fields.filter((field) =>
            schemas.ALLOWED_BOOK_FIELDS.includes(field as schemas.BookField),
          )

          return pick(book, validFields) as schemas.Book
        }

        return book
      }),

    saveBookProjection: vi
      .fn()
      .mockImplementation(async (bookProjection: schemas.Book) => {
        // Mock implementation just records the call
        return Promise.resolve()
      }),

    updateBookProjection: vi
      .fn()
      .mockImplementation(
        async (
          id: string,
          changes: Partial<
            Pick<
              schemas.Book,
              | 'title'
              | 'author'
              | 'publicationYear'
              | 'publisher'
              | 'price'
              | 'isbn'
            >
          >,
          updatedAt: Date | string,
        ) => {
          const index = books.findIndex((b) => b.id === id)

          if (index === -1) {
            throw new Error(
              `Book projection with id "${id}" not found or already deleted.`,
            )
          }

          // Mock implementation just records the call
          return Promise.resolve()
        },
      ),

    markAsDeleted: vi
      .fn()
      .mockImplementation(async (id: string, timestamp: Date) => {
        const index = books.findIndex((b) => b.id === id)

        if (index === -1) {
          throw new Error(
            `Book projection with id "${id}" not found or already deleted.`,
          )
        }

        // Mock implementation just records the call
        return Promise.resolve()
      }),
  }
}

/**
 * Helper function to reset all mocks in a book repository.
 * Call this in beforeEach() to ensure clean state between tests.
 *
 * @param repository - The mocked repository to reset
 */
export function resetMockBookProjectionRepository(
  repository: IBookProjectionRepository,
): void {
  Object.values(repository).forEach((method) => {
    if (typeof method === 'function' && 'mockClear' in method) {
      method.mockClear()
    }
  })
}

/**
 * Creates a pre-configured repository that will return empty results.
 * Useful for testing empty state handling.
 *
 * @returns A mock repository that will return empty results
 */
export function createEmptyMockBookProjectionRepository(): IBookProjectionRepository {
  return createMockBookProjectionRepository([])
}

/**
 * Creates a pre-configured repository that will throw errors on all methods.
 * Useful for testing error handling.
 *
 * @param errorMessage - Optional custom error message
 * @returns A mock repository that will throw errors
 */
export function createErrorMockBookProjectionRepository(
  errorMessage = 'Mock repository error',
): IBookProjectionRepository {
  const error = new Error(errorMessage)

  return {
    getAllBooks: vi.fn().mockRejectedValue(error),
    getBookById: vi.fn().mockRejectedValue(error),
    getBookByIsbn: vi.fn().mockRejectedValue(error),
    saveBookProjection: vi.fn().mockRejectedValue(error),
    updateBookProjection: vi.fn().mockRejectedValue(error),
    markAsDeleted: vi.fn().mockRejectedValue(error),
  }
}
