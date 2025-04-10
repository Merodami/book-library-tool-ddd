import { Request, Response, NextFunction } from 'express'
import type {
  BookCreateRequest,
  BookUpdateRequest,
} from '@book-library-tool/sdk'
import { BookFacade } from './BookFacade.js'

export class BookController {
  constructor(private readonly bookService: BookFacade) {
    this.createBook = this.createBook.bind(this)
    this.getBook = this.getBook.bind(this)
    this.deleteBook = this.deleteBook.bind(this)
    this.updateBook = this.updateBook.bind(this)
  }

  /**
   * POST /books
   * Creates a new book using the event-sourced process.
   * The BookService will generate a BookCreated event, persist it, and publish it.
   */
  async createBook(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const { isbn, title, author, publicationYear, publisher, price } =
        req.body as BookCreateRequest

      // Build the command (BookCreateRequest can serve as your create command here)
      const newBook: BookCreateRequest = {
        isbn,
        title,
        author,
        publicationYear,
        publisher,
        price,
      }

      // Call the service to create the book.
      // The service handles generating and persisting the domain event.
      await this.bookService.createBook(newBook)

      // Respond with a 201 status code.
      res
        .status(201)
        .json({ message: 'Book created successfully', book: newBook })
    } catch (error) {
      next(error)
    }
  }

  /**
   * GET /books/:isbn
   * Retrieves a book by its ISBN.
   * This method calls the service which rehydrates the Book aggregate from its events.
   */
  async getBook(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const { isbn } = req.params as Pick<BookCreateRequest, 'isbn'>

      // Retrieve the rehydrated Book aggregate via the service.
      const bookAggregate = await this.bookService.getBook({ isbn })

      // Return the current state of the Book aggregate.
      res.status(200).json(bookAggregate)
    } catch (error) {
      next(error)
    }
  }

  /**
   * DELETE /books/:isbn
   * Deletes a book reference by its ISBN.
   * The deletion is handled as a soft delete that generates a BookDeleted event.
   */
  async deleteBook(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const { isbn } = req.params as Pick<BookCreateRequest, 'isbn'>

      await this.bookService.deleteBook({ isbn })

      res.status(200).json({ message: 'Book deleted successfully' })
    } catch (error) {
      next(error)
    }
  }

  /**
   * PATCH /books/:isbn
   * Partially updates a book. Generates a BookUpdated event,
   * persists it, and publishes it.
   */
  async updateBook(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const { isbn } = req.params as Pick<BookCreateRequest, 'isbn'>
      const { title, author, publicationYear, publisher, price } =
        req.body as BookUpdateRequest

      await this.bookService.updateBook({
        isbn,
        title,
        author,
        publicationYear,
        publisher,
        price,
      })

      res.status(200).json({ message: 'Book updated successfully' })
    } catch (err) {
      next(err)
    }
  }
}
