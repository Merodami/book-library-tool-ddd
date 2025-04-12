/**
 * Command for creating a new book.
 */
export interface CreateBookCommand {
  /** The ISBN of the book */
  isbn: string
  /** The title of the book */
  title: string
  /** The author of the book */
  author: string
  /** The year the book was published */
  publicationYear: number
  /** The publisher of the book */
  publisher: string
  /** The retail price of the book */
  price: number
}
