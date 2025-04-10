import type { BookCreateRequest } from '@book-library-tool/sdk'
import { NextFunction, Request, Response } from 'express'

import { BookFacade } from './BookFacade.js'

export class GetBookController {
  constructor(private readonly bookService: BookFacade) {
    this.getBook = this.getBook.bind(this)
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
}
