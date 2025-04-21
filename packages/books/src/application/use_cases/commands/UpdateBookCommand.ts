/**
 * Command for updating an existing book's details.
 */
export interface UpdateBookCommand {
  /** The ID of the book to update */
  id: string
  /** The ISBN of the book to update */
  isbn?: string
  /** The new title of the book */
  title: string
  /** The new author of the book */
  author: string
  /** The new publication year of the book */
  publicationYear: number
  /** The new publisher of the book */
  publisher: string
  /** The new price of the book */
  price: number
}
