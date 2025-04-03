import { Request, Response, NextFunction } from 'express'
import { BookService, BookCreationData } from '@book-library-tool'

// Option 1: Create an instance here (for simple scenarios)
// You could import a concrete repository implementation (e.g. MongoBookRepository)
// and pass it to the BookService. For this example, assume it's already instantiated.
const bookService =
  new BookService(/* pass an instance of IBookRepository, e.g., new MongoBookRepository() */)

// Option 2: Alternatively, you could use dependency injection or a factory to create the controller.

export class BookController {
  constructor(private readonly bookService: BookService) {}

  // POST /books
  async createBook(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      // Assuming the request body is validated by middleware.
      const data: BookCreationData = req.body

      const book = await this.bookService.createBook(data)

      res.status(201).json(book)
    } catch (error) {
      next(error)
    }
  }

  // GET /books/:id
  async getBook(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const { id } = req.params

      const book = await this.bookService.getBookById(id)

      if (!book) {
        res.status(404).json({ message: 'Book not found.' })
      } else {
        res.status(200).json(book)
      }
    } catch (error) {
      next(error)
    }
  }

  // DELETE /books/:id
  async deleteBook(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const { id } = req.params
      const deleted = await this.bookService.deleteBookById(id)
      if (deleted) {
        res.status(200).json({ message: 'Book deleted successfully.' })
      } else {
        res.status(404).json({ message: 'Book not found.' })
      }
    } catch (error) {
      next(error)
    }
  }
}

// Optionally, you can export an instance of the controller:
export const bookController = new BookController(bookService)
