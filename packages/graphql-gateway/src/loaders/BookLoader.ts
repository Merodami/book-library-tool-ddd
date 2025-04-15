import { Book } from '@book-library-tool/sdk'
import DataLoader from 'dataloader'

import { BooksService } from '../modules/books/service.js'

export class BookLoader {
  private loader: DataLoader<string, Book | null>
  private booksService: BooksService

  constructor() {
    this.booksService = new BooksService()
    this.loader = new DataLoader(async (isbns: readonly string[]) => {
      try {
        // For single book loading, use getBook method
        if (isbns.length === 1) {
          const book = await this.booksService.getBook(isbns[0])
          return [book]
        }

        // For multiple books, use getBooks with filter
        const isbnString = isbns.join(',')
        const response = await this.booksService.getBooks({
          filter: { isbn: isbnString },
          limit: isbns.length,
        })

        const booksMap = new Map<string, Book>()
        response.books.forEach((book: Book) => {
          const plainBook = {
            isbn: book.isbn,
            title: book.title,
            author: book.author,
            publicationYear: book.publicationYear,
            publisher: book.publisher,
            price: book.price,
            createdAt: book.createdAt,
            updatedAt: book.updatedAt,
          }
          booksMap.set(book.isbn, plainBook)
        })

        return isbns.map((isbn) => booksMap.get(isbn) || null)
      } catch (error) {
        console.error('Error loading books:', error)
        return isbns.map(() => null)
      }
    })
  }

  load(isbn: string): Promise<Book | null> {
    return this.loader.load(isbn)
  }

  loadMany(isbns: string[]): Promise<(Book | null)[]> {
    return this.loader.loadMany(isbns) as Promise<(Book | null)[]>
  }
}
