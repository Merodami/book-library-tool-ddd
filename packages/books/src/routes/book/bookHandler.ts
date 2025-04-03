import { Request, Response, NextFunction } from 'express'
import { DatabaseService } from '@book-library-tool/database'
import { Book, BookId } from '@book-library-tool/sdk'

export const bookHandler = {
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
      const { id, title, author, publicationYear, publisher, price } =
        req.body as Book

      const booksCollection = DatabaseService.getCollection<Book>('books')

      // Check if the book already exists.
      const referencedBook = await DatabaseService.findOne<Book>(
        booksCollection,
        { id: id.trim() },
      )

      if (referencedBook) {
        res.status(400).json({
          message: 'Book with provided ID already exists.',
        })
        return
      }

      // Create a new book reference.
      const newBook: Book = {
        id: id.trim(),
        title: title.trim(),
        author: author.trim(),
        publicationYear: Number(publicationYear),
        publisher: publisher ? publisher.trim() : '',
        price: price !== undefined ? Number(price) : 0,
      }

      await DatabaseService.insertDocument(booksCollection, newBook)

      res.status(201).json(newBook)
    } catch (error) {
      next(error)
    }
  },

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
      const { referenceId } = req.params as BookId

      const booksCollection = DatabaseService.getCollection<Book>('books')

      const referencedBook = await DatabaseService.findOne<Book>(
        booksCollection,
        { id: referenceId },
      )

      if (!referencedBook) {
        res.status(404).json({ message: 'Book not found.' })
        return
      }

      res.status(200).json(referencedBook)
    } catch (error) {
      next(error)
    }
  },

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
      const { referenceId } = req.params as BookId

      const booksCollection = DatabaseService.getCollection<Book>('books')

      const result = await booksCollection.deleteOne({ id: referenceId })

      if (result.deletedCount === 0) {
        res.status(404).json({ message: 'Book not found.' })
        return
      }

      res.status(200).json({ message: 'Book deleted successfully.' })
    } catch (error) {
      next(error)
    }
  },
}
