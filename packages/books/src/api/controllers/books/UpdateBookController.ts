import type { BookUpdateRequest } from '@book-library-tool/sdk'
import { UpdateBookHandler } from '@commands/UpdateBookHandler.js'
import { NextFunction, Request, Response } from 'express'

export class UpdateBookController {
  constructor(private readonly updateBookHandler: UpdateBookHandler) {
    this.updateBook = this.updateBook.bind(this)
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
      const { isbn } = req.params
      const { title, author, publicationYear, publisher, price } =
        req.body as BookUpdateRequest

      await this.updateBookHandler.execute({
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
