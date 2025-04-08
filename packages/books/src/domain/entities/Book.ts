import { validateRequiredFields } from '@book-library-tool/shared'
import { makeValidator } from '@book-library-tool/api'
import { schemas } from '@book-library-tool/api'

const assertBookSchema = makeValidator(schemas.BookSchema)

export class Book {
  private constructor(
    public readonly isbn: string,
    public title: string,
    public author: string,
    public publicationYear: number,
    public publisher: string,
    public price: number,
    public createdAt: Date = new Date(),
    public updatedAt: Date = new Date(),
    public readonly deletedAt?: Date,
  ) {}

  static create(props: schemas.BookDTO): Book {
    // Validate the props against the schema
    assertBookSchema(props)

    return new Book(
      props.isbn.trim(),
      props.title.trim(),
      props.author.trim(),
      props.publicationYear,
      props.publisher.trim(),
      props.price,
    )
  }

  static rehydrate(raw: schemas.BookDTO): Book {
    assertBookSchema(raw)

    const now = new Date()

    return new Book(
      raw.isbn,
      raw.title,
      raw.author,
      raw.publicationYear,
      raw.publisher,
      raw.price,
      raw.createdAt ? new Date(raw.createdAt) : now,
      raw.updatedAt ? new Date(raw.updatedAt) : now,
      raw.deletedAt ? new Date(raw.deletedAt) : undefined,
    )
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
