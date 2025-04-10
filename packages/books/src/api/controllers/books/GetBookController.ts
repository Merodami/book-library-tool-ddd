import { GetBookHandler } from '@queries/GetBookHandler.js'
import { NextFunction, Request, Response } from 'express'

export class GetBookController {
  constructor(private readonly getBookHandler: GetBookHandler) {
    this.getBook = this.getBook.bind(this)
  }

  /**
   * GET /books/:isbn
   * Retrieves a book by ISBN.
   */
  async getBook(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const { isbn } = req.params

      const book = await this.getBookHandler.execute({ isbn })

      res.status(200).json(book)
    } catch (error) {
      next(error)
    }
  }
}
