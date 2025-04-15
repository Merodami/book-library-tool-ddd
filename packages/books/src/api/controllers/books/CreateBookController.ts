import type { CreateBookCommand } from '@commands/CreateBookCommand.js'
import { CreateBookHandler } from '@commands/CreateBookHandler.js'
import { NextFunction, Request, Response } from 'express'

export class CreateBookController {
  constructor(private readonly createBookHandler: CreateBookHandler) {
    this.createBook = this.createBook.bind(this)
  }

  /**
   * POST /books
   * Creates a new book using the event-sourced process.
   * Generates a BookCreated event, persists it, and publishes it.
   */
  async createBook(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const { isbn, title, author, publicationYear, publisher, price } =
        req.body as CreateBookCommand

      // Build the command
      const command: CreateBookCommand = {
        isbn,
        title,
        author,
        publicationYear,
        publisher,
        price,
      }

      // Call the handler directly to create the book
      await this.createBookHandler.execute(command)

      // Respond with a 201 status code
      res
        .status(201)
        .json({ message: 'Book created successfully', book: command })
    } catch (error) {
      next(error)
    }
  }
}
