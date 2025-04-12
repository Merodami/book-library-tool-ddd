/**
 * Command for deleting a book from the system.
 */
export interface DeleteBookCommand {
  /** The ISBN of the book to delete */
  isbn: string
}
