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
    if (
      !isbn ||
      !title ||
      !author ||
      !publicationYear ||
      !publisher ||
      !price
    ) {
      throw Error(
        'ISBN, title, author, publicationYear, publisher and price are required',
      )
    }

    if (!isbn.trim()) {
      throw new Error('Book ID cannot be empty')
    }

    if (!title.trim()) {
      throw new Error('Title cannot be empty')
    }

    if (!author.trim()) {
      throw new Error('Author cannot be empty')
    }

    if (isNaN(publicationYear)) {
      throw new Error('Publication year must be a number')
    }

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

  // Use case Update Title
  updateTitle(newTitle: string): void {
    if (!newTitle.trim()) {
      throw new Error('Title cannot be empty')
    }

    this.title = newTitle

    this.updatedAt = new Date()
  }
}
