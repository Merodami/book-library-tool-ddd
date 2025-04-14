import { DeleteBookHandler } from '@books/commands/DeleteBookHandler.js'
import { NextFunction, Request, Response } from 'express'

export class DeleteBookController {
  constructor(private readonly deleteBookHandler: DeleteBookHandler) {
    this.deleteBook = this.deleteBook.bind(this)
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
      const { isbn } = req.params

      await this.deleteBookHandler.execute({ isbn })

      res.status(200).json({ message: 'Book deleted successfully' })
    } catch (error) {
      next(error)
    }
  }
}
