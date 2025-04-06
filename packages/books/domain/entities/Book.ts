import { validateRequiredFields } from '@book-library-tool/shared'

export class Book {
  public readonly isbn: string
  public title: string
  public author: string
  public publicationYear: number
  public publisher: string
  public price: number
  public createdAt: Date
  public updatedAt: Date
  public deletedAt: Date

  constructor(
    isbn: string,
    title: string,
    author: string,
    publicationYear: number,
    publisher: string,
    price: number,
    createdAt: Date = new Date(),
    updatedAt: Date = new Date(),
    deletedAt: Date = new Date(),
  ) {
    validateRequiredFields({
      isbn,
      title,
      author,
      publicationYear,
      publisher,
      price,
    })

    this.isbn = isbn.trim()
    this.title = title.trim()
    this.author = author.trim()
    this.publicationYear = publicationYear
    this.publisher = publisher.trim()
    this.price = price
    this.createdAt = createdAt
    this.updatedAt = updatedAt
    this.deletedAt = deletedAt
  }

  // Business behavior to update the title
  updateTitle(newTitle: string): void {
    validateRequiredFields({
      newTitle,
    })

    this.title = newTitle.trim()

    this.updatedAt = new Date()
  }
}
