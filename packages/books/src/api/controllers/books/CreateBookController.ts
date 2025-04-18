import type { CreateBookCommand } from '@books/commands/CreateBookCommand.js'
import { CreateBookHandler } from '@books/commands/CreateBookHandler.js'
import { FastifyReply, FastifyRequest } from 'fastify'

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
    reply: FastifyReply,
  ) {
    const { isbn, title, author, publicationYear, publisher, price } =
      request.body

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
    return reply
      .code(201)
      .send({ message: 'Book created successfully', book: command })
  }
}
