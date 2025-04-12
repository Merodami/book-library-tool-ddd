/** Command for creating a new book reservation */
export interface CreateReservationCommand {
  /** The ISBN of the book to reserve */
  isbn: string
  /** The title of the book */
  title: string
  /** The author of the book */
  author: string
  /** The year the book was published */
  publicationYear: number
  /** The publisher of the book */
  publisher: string
  /** The price of the book */
  price: number
}
