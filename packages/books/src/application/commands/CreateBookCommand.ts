export interface CreateBookCommand {
  isbn: string
  title: string
  author: string
  publicationYear: number
  publisher: string
  price: number
}

// export interface CreateBookCommandHandler {
//   handle(command: CreateBookCommand): Promise<void>
// }

// export class CreateBookCommandHandlerImpl implements CreateBookCommandHandler {
//   constructor(
//     private readonly bookRepository: IBookRepository,
//     private readonly eventStore: EventStore,
//   ) {}
//   async handle(command: CreateBookCommand): Promise<void> {
//     const book = Book.create(command)
//     await this.bookRepository.create(book)
//     const event: DomainEvent = {
//       aggregateId: book.isbn,
//       eventType: 'BOOK_CREATED',
//       payload: book,
//       timestamp: new Date(),
//       version: 1,
//     }
//     await this.eventStore.saveEvent(event)
//   }
// }
