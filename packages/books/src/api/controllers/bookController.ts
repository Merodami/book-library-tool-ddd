import { Request, Response, NextFunction } from 'express'
import { BookService } from '@use_cases/BookService.js'
import { BookRequest } from '@book-library-tool/sdk'
import { Errors } from '@book-library-tool/shared'

export class BookController {
  /**
   * JavaScript class that handles HTTP requests related to book references.
   * It provides methods to create, retrieve, and delete book references.
   *
   * @param bookService
   */
  constructor(private readonly bookService: BookService) {
    this.createBook = this.createBook.bind(this)
    this.getBook = this.getBook.bind(this)
    this.deleteBook = this.deleteBook.bind(this)
  }

  /**
   * POST /books
   * Create a new book.
   * Expects a JSON body:
   * {
   *   "id": string,
   *   "title": string,
   *   "author": string,
   *   "publicationYear": number,
   *   "publisher": string,
   *   "price": number
   * }
   * Create a new book reference.
   */
  async createBook(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const { isbn, title, author, publicationYear, publisher, price } =
        req.body as BookRequest

      // Create a new book reference.
      const newBook: BookRequest = {
        isbn,
        title,
        author,
        publicationYear,
        publisher,
        price,
      }

      await this.bookService.createBook(newBook)

      res.status(201).json(newBook)
    } catch (error) {
      next(error)
    }
  }

  /**
   * GET /books/:referenceId
   * Get a book reference by ID.
   */
  async getBook(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const { isbn } = req.params as Pick<BookRequest, 'isbn'>

      const referencedBook = await this.bookService.getBookByISBN(isbn)

      res.status(200).json(referencedBook)
    } catch (error) {
      next(error)
    }
  }

  /**
   * DELETE /books/:referenceId
   * Delete a book reference by ID.
   */
  async deleteBook(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const { isbn } = req.params as Pick<BookRequest, 'isbn'>

      await this.bookService.deleteBookByISBN(isbn)

      res.status(200).json({ message: 'Book deleted successfully.' })
    } catch (error) {
      next(error)
    }
  }
}
