import {
  apiBooks,
  Book as SDKBook,
  BookCreateRequest,
  BookUpdateRequest,
} from '@book-library-tool/sdk'
import { GraphQLError } from 'graphql'

/**
 * GraphQL Book type that includes id field
 */
type GraphQLBook = SDKBook & {
  id: string
}

export interface BookFilter {
  title?: string
  author?: string
  isbn?: string
  publicationYear?: number
  publisher?: string
  price?: number
  publicationYearRange?: {
    min?: number
    max?: number
  }
  priceRange?: {
    min?: number
    max?: number
  }
}

export interface SortInput {
  field: string
  order: 'ASC' | 'DESC'
}

interface GetBooksOptions {
  filter?: BookFilter
  skip?: number
  limit?: number
  sort?: SortInput
  fields?: string[]
}

interface GetBooksResult {
  books: GraphQLBook[]
  total: number
}

/**
 * Books service client with optimized data transfer
 */
export class BooksService {
  /**
   * Retrieves books with filtering, pagination, and sorting
   * Optimizes data transfer by pushing filtering to the database
   */
  async getBooks({
    filter,
    skip = 0,
    limit = 10,
    sort,
    fields = [
      'id',
      'title',
      'author',
      'isbn',
      'publicationYear',
      'publisher',
      'price',
    ],
  }: GetBooksOptions = {}): Promise<GetBooksResult> {
    try {
      if (!apiBooks?.default?.getCatalog) {
        throw new GraphQLError('Books API client not available')
      }

      // Build query parameters for the API
      const queryParams: Record<string, any> = {
        page: Math.floor(skip / limit) + 1,
        limit,
        fields,
      }

      // Add filter parameters if provided
      if (filter) {
        if (filter.title) queryParams.title = filter.title
        if (filter.author) queryParams.author = filter.author
        if (filter.isbn) queryParams.isbn = filter.isbn
        if (filter.publicationYear)
          queryParams.publicationYear = filter.publicationYear
        if (filter.publisher) queryParams.publisher = filter.publisher
        if (filter.price) queryParams.price = filter.price
        if (filter.publicationYearRange) {
          if (filter.publicationYearRange.min !== undefined) {
            queryParams.publicationYearMin = filter.publicationYearRange.min
          }
          if (filter.publicationYearRange.max !== undefined) {
            queryParams.publicationYearMax = filter.publicationYearRange.max
          }
        }
        if (filter.priceRange) {
          if (filter.priceRange.min !== undefined) {
            queryParams.priceMin = filter.priceRange.min
          }
          if (filter.priceRange.max !== undefined) {
            queryParams.priceMax = filter.priceRange.max
          }
        }
      }

      // Add sort parameters if provided
      if (sort) {
        queryParams.sortBy = sort.field
        queryParams.sortOrder = sort.order
      }

      // Call the API and get the response
      const response = await apiBooks.default.getCatalog(queryParams)

      // Create plain objects to avoid circular references
      const books = response.data.map((book: any) => ({
        id: book.id,
        isbn: book.isbn,
        title: book.title,
        author: book.author,
        publicationYear: book.publicationYear,
        publisher: book.publisher,
        price: book.price,
        createdAt: book.createdAt,
        updatedAt: book.updatedAt,
      }))

      return {
        books,
        total: response.pagination.total,
      }
    } catch (error) {
      console.error('Error in getBooks:', error)
      throw new GraphQLError('Failed to fetch books', {
        extensions: {
          code: 'BOOKS_FETCH_ERROR',
          originalError: error,
        },
      })
    }
  }

  /**
   * Retrieves a book by its ISBN with field selection
   */
  async getBook(isbn: string, fields?: string[]): Promise<GraphQLBook | null> {
    try {
      if (!apiBooks?.default?.getCatalog) {
        throw new GraphQLError('Books API client not available')
      }

      const result = await apiBooks.default.getCatalog({
        isbn,
        fields: fields || [
          'title',
          'author',
          'isbn',
          'publicationYear',
          'publisher',
          'price',
        ],
        limit: 1,
      })

      if (!result?.data?.length) {
        return null
      }

      const book = result.data[0]
      // Create a plain object to avoid circular references
      return {
        id: book.isbn,
        isbn: book.isbn,
        title: book.title,
        author: book.author,
        publicationYear: book.publicationYear,
        publisher: book.publisher,
        price: book.price,
        createdAt: book.createdAt,
        updatedAt: book.updatedAt,
      }
    } catch (error) {
      console.error('Error in getBook:', error)
      throw new GraphQLError('Failed to fetch book', {
        extensions: {
          code: 'BOOK_FETCH_ERROR',
          originalError: error,
        },
      })
    }
  }

  /**
   * Creates a new book with validation
   */
  async createBook(book: BookCreateRequest): Promise<GraphQLBook> {
    try {
      if (!apiBooks?.default?.postBooks) {
        throw new GraphQLError('Books API client not available')
      }

      // Validate ISBN format
      if (!this.isValidISBN(book.isbn)) {
        throw new GraphQLError('Invalid ISBN format', {
          extensions: {
            code: 'INVALID_ISBN',
          },
        })
      }

      const createdBook = await apiBooks.default.postBooks({
        requestBody: book,
      })

      return {
        ...createdBook,
        id: createdBook.isbn,
      }
    } catch (error) {
      console.error('Error in createBook:', error)
      throw new GraphQLError(
        error instanceof Error ? error.message : 'Failed to create book',
        {
          extensions: {
            code: 'BOOK_CREATE_ERROR',
            originalError: error,
          },
        },
      )
    }
  }

  /**
   * Updates an existing book with validation
   */
  async updateBook(
    isbn: string,
    book: BookUpdateRequest,
  ): Promise<GraphQLBook> {
    try {
      if (!apiBooks?.default?.patchBooks) {
        throw new GraphQLError('Books API client not available')
      }

      const updatedBook = await apiBooks.default.patchBooks({
        isbn,
        requestBody: book,
      })

      return {
        ...updatedBook,
        id: updatedBook.isbn,
      }
    } catch (error) {
      console.error('Error in updateBook:', error)
      throw new GraphQLError(
        error instanceof Error ? error.message : 'Failed to update book',
        {
          extensions: {
            code: 'BOOK_UPDATE_ERROR',
            originalError: error,
          },
        },
      )
    }
  }

  /**
   * Deletes a book with proper error handling
   */
  async deleteBook(isbn: string): Promise<void> {
    try {
      if (!apiBooks?.default?.deleteBooks) {
        throw new GraphQLError('Books API client not available')
      }

      await apiBooks.default.deleteBooks({ isbn })
    } catch (error) {
      console.error('Error in deleteBook:', error)
      throw new GraphQLError(
        error instanceof Error ? error.message : 'Failed to delete book',
        {
          extensions: {
            code: 'BOOK_DELETE_ERROR',
            originalError: error,
          },
        },
      )
    }
  }

  /**
   * Validates ISBN format
   */
  private isValidISBN(isbn: string): boolean {
    // Remove any hyphens or spaces
    const cleanISBN = isbn.replace(/[-\s]/g, '')

    // ISBN-10 or ISBN-13
    if (cleanISBN.length === 10) {
      return this.isValidISBN10(cleanISBN)
    } else if (cleanISBN.length === 13) {
      return this.isValidISBN13(cleanISBN)
    }

    return false
  }

  private isValidISBN10(isbn: string): boolean {
    let sum = 0
    for (let i = 0; i < 9; i++) {
      const char = isbn.charAt(i)
      if (!/^\d$/.test(char)) return false
      sum += parseInt(char, 10) * (10 - i)
    }
    const lastChar = isbn.charAt(9)
    const checkDigit =
      lastChar.toUpperCase() === 'X' ? 10 : parseInt(lastChar, 10)
    if (isNaN(checkDigit)) return false
    return (sum + checkDigit) % 11 === 0
  }

  private isValidISBN13(isbn: string): boolean {
    let sum = 0
    for (let i = 0; i < 12; i++) {
      const char = isbn.charAt(i)
      if (!/^\d$/.test(char)) return false
      sum += parseInt(char, 10) * (i % 2 === 0 ? 1 : 3)
    }
    const lastChar = isbn.charAt(12)
    if (!/^\d$/.test(lastChar)) return false
    const checkDigit = parseInt(lastChar, 10)
    return (10 - (sum % 10)) % 10 === checkDigit
  }
}
