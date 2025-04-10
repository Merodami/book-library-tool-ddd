export interface UpdateBookCommand {
  isbn: string
  title?: string
  author?: string
  publicationYear?: number
  publisher?: string
  price?: number
}
