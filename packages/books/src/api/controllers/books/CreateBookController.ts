import { EventResponse } from '@book-library-tool/sdk'
import {
  CreateBookCommand,
  CreateBookHandler,
} from '@books/application/index.js'
import { FastifyRequest } from 'fastify'

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
    request: FastifyRequest<{
      Body: CreateBookCommand
    }>,
  ): Promise<EventResponse & { bookId: string }> {
    const { isbn, title, author, publicationYear, publisher, price } =
      request.body

    const command: CreateBookCommand = {
      isbn,
      title,
      author,
      publicationYear,
      publisher,
      price,
    }

    const result = await this.createBookHandler.execute(command)

    return result
  }
}
