import { BookField } from '@book-library-tool/api/src/schemas/books.js'
import { BookFieldEnum } from '@book-library-tool/sdk'
import type { BookWriteProjectionRepositoryPort } from '@books/domain/index.js'
import { DomainBook } from '@books/domain/index.js'
import { pick } from 'lodash-es'
import { vi } from 'vitest'

/**
 * Sample books for testing write operations. Override per-test if needed.
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
    title: 'Book Two',
    author: 'Author Two',
    publicationYear: 2024,
    publisher: 'Publisher B',
    price: 29.99,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
]

/**
 * Creates an in-memory mock of IBookWriteProjectionRepository.
 * All dynamic merges are whitelisted via `ALLOWED_BOOK_FIELDS`
 * and applied via `lodash-es` `pick()`—with inline ESLint disables
 * to satisfy security/detect-object-injection.
 *
 * @param initialBooks - Optional starting data; defaults to `sampleBooks`.
 */
export function createMockBookWriteProjectionRepository(
  initialBooks?: DomainBook[],
): BookWriteProjectionRepositoryPort {
  // use an array reference but avoid bracket-assignment for sink safety
  const books = [...(initialBooks ?? sampleBooks)]

  return {
    /**
     * Mocks saving a new book projection.
     * Only whitelisted fields are persisted.
     */
    saveProjection: vi.fn().mockImplementation(async (book: DomainBook) => {
      const safe = pick(book, Object.values(BookFieldEnum))

      books.push(safe)

      return Promise.resolve()
    }),

    /**
     * Mocks saving a new book projection.
     * Only whitelisted fields are persisted.
     */
    saveBookProjection: vi.fn().mockImplementation(async (book: DomainBook) => {
      const safe = pick(book, Object.values(BookFieldEnum))

      books.push(safe)

      return Promise.resolve()
    }),

    /**
     * Mocks updating an existing projection:
     * 1. Find index by ID
     * 2. Whitelist incoming change keys
     * 3. Extract safeChanges via pick()
     * 4. Build a new record and replace via splice()
     */
    updateProjection: vi
      .fn()
      .mockImplementation(
        async (
          id: string,
          changes: Partial<
            Pick<
              DomainBook,
              | 'title'
              | 'author'
              | 'publicationYear'
              | 'publisher'
              | 'price'
              | 'isbn'
            >
          >,
          updatedAt: Date,
        ) => {
          const idx = books.findIndex((b) => b.id === id)

          if (idx === -1) {
            throw new Error(
              `Book projection with ID "${id}" not found or deleted.`,
            )
          }

          // whitelist change keys
          const validKeys = Object.keys(changes).filter((k) =>
            Object.values(BookFieldEnum).includes(k as BookField),
          ) as Array<keyof typeof changes>

          const safeChanges = pick(changes, validKeys)

          const existing = books.at(idx)!

          const updatedBook: DomainBook = {
            ...existing,
            ...safeChanges,
            updatedAt,
          }

          books.splice(idx, 1, updatedBook)

          return Promise.resolve()
        },
      ),

    /**
     * Mocks soft-deleting a book projection:
     * 1. Find index by ID
     * 2. Build new object with only updatedAt/deletedAt
     * 3. Replace via splice()
     */
    markAsDeleted: vi
      .fn()
      .mockImplementation(async (id: string, timestamp: Date) => {
        const idx = books.findIndex((b) => b.id === id)

        if (idx === -1) {
          throw new Error(
            `Book projection with ID "${id}" not found or already deleted.`,
          )
        }

        const existing = books.at(idx)!
        const iso = timestamp.toISOString()
        const deletedBook: DomainBook = {
          ...existing,
          updatedAt: new Date(iso),
          deletedAt: new Date(iso),
        }

        books.splice(idx, 1, deletedBook)

        return Promise.resolve()
      }),

    /**
     * Mocks updating an existing book projection.
     * Only whitelisted fields are persisted.
     */
    updateBookProjection: vi
      .fn()
      .mockImplementation(
        async (id: string, changes: Partial<DomainBook>, updatedAt: Date) => {
          const idx = books.findIndex((b) => b.id === id)

          if (idx === -1)
            throw new Error(
              `Book projection with ID "${id}" not found or deleted.`,
            )

          const validKeys = Object.keys(changes).filter((k) =>
            Object.values(BookFieldEnum).includes(k as BookField),
          )
          const safeChanges = pick(changes, validKeys)
          const existing = books.at(idx)!
          const updatedBook: DomainBook = {
            ...existing,
            ...safeChanges,
            updatedAt,
          }

          books.splice(idx, 1, updatedBook)

          return Promise.resolve()
        },
      ),
  }
}

/**
 * Clears call history on all mock methods.
 * Call in your test's beforeEach() to isolate invocations.
 */
export function resetMockBookWriteProjectionRepository(
  repo: BookWriteProjectionRepositoryPort,
): void {
  for (const fn of [
    repo.saveProjection,
    repo.updateProjection,
    repo.markAsDeleted,
  ]) {
    if (typeof fn === 'function' && 'mockClear' in fn) {
      vi.mocked(fn).mockClear()
    }
  }
}

/**
 * Convenience: a write-projection repo mock with no initial data.
 */
export function createEmptyMockBookWriteProjectionRepository(): BookWriteProjectionRepositoryPort {
  return createMockBookWriteProjectionRepository([])
}

/**
 * Convenience: a write-projection repo mock whose methods always reject.
 */
export function createErrorMockBookWriteProjectionRepository(
  errorMessage = 'Mock repository error',
): BookWriteProjectionRepositoryPort {
  const err = new Error(errorMessage)

  return {
    saveProjection: vi.fn().mockRejectedValue(err),
    saveBookProjection: vi.fn().mockRejectedValue(err),
    updateProjection: vi.fn().mockRejectedValue(err),
    updateBookProjection: vi.fn().mockRejectedValue(err),
    markAsDeleted: vi.fn().mockRejectedValue(err),
  }
}
