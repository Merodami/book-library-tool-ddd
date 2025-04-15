import type { UpdateBookCommand } from '@commands/UpdateBookCommand.js'
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
        req.body as UpdateBookCommand

      const command: UpdateBookCommand = {
        isbn,
        title,
        author,
        publicationYear,
        publisher,
        price,
      }

      // Call the handler directly to update the book
      await this.updateBookHandler.execute(command)

      // Respond with a 200 status code
      res
        .status(200)
        .json({ message: 'Book updated successfully', book: command })
    } catch (error) {
      next(error)
    }
  }
}
