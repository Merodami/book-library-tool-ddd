import { MongoDatabaseService } from '@book-library-tool/database'
import {
  BOOK_CREATED,
  BOOK_DELETED,
  BOOK_UPDATED,
  DomainEvent,
  RabbitMQEventBus,
} from '@book-library-tool/event-store'
import { Book } from '@book-library-tool/sdk'
import { logger } from '@book-library-tool/shared'
import { BookWriteRepository } from '@books/persistence/mongo/BookWriteRepository.js'
import { CreateBookHandler } from '@books/use_cases/commands/CreateBookHandler.js'
import fastcsv from 'fast-csv'
import fs from 'fs'
import he from 'he'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

/**
 * Decode a string from latin1 to utf8.
 * This function helps fix mis‐encoded text (e.g. "TÃ?Â¶dliche LÃ?Â¼gen." becomes "Tödliche Lügen.").
 */
function decodeText(text: string): string {
  return Buffer.from(text, 'latin1').toString('utf8')
}

/**
 * Decode HTML entities using Lodash's unescape.
 * This will convert "&amp;" to "&", etc.
 */
function decodeHTMLEntities(text: string): string {
  return he.decode(text)
}

const isInvalidBook = (book: Book) => {
  return (
    book.isbn === undefined ||
    book.isbn === null ||
    book.isbn === '' ||
    book.title === undefined ||
    book.title === null ||
    book.title === '' ||
    book.author === undefined ||
    book.author === null ||
    book.author === '' ||
    book.publicationYear === undefined ||
    book.publicationYear === null
  )
}

async function seedBooks() {
  try {
    const csvFilePath = path.join(__dirname, '/csv/books_sample.csv')

    // Set up the CSV stream with fast-csv
    const stream = fs
      .createReadStream(csvFilePath)
      .pipe(fastcsv.parse({ headers: true, ignoreEmpty: true, trim: true }))

    let processedCount = 0
    let skippedCount = 0

    // Create an instance of your BookService (which uses the command infrastructure and event sourcing)
    const dbService = new MongoDatabaseService(
      process.env.MONGO_DB_NAME_EVENT || 'events',
    )

    const bookService = await getBookService(dbService)

    // Process each record sequentially via an async iterator.
    for await (const record of stream) {
      processedCount++

      if (processedCount <= 3) {
        logger.info(`Record #${processedCount}:`, record)
      }

      try {
        // Create a command for the book using the CSV record.
        // Adjust the field names to match your CSV structure.
        const command = {
          isbn: String(record.id || '').trim(), // or record.isbn if available
          title: record.title
            ? decodeHTMLEntities(decodeText(String(record.title).trim()))
            : '',
          author: record.author
            ? decodeHTMLEntities(decodeText(String(record.author).trim()))
            : '',
          publicationYear: Number(record.publication_year || 0),
          publisher: record.publisher
            ? decodeHTMLEntities(decodeText(String(record.publisher).trim()))
            : '',
          price: Number(record.price || 0),
        }

        // Validate the book command – skip if required fields are missing.
        if (isInvalidBook(command)) {
          logger.info(
            `Skipping record #${processedCount} due to missing required fields:`,
            command,
          )

          skippedCount++

          continue
        }

        // Process the command by calling createBook on the BookService.
        await bookService.execute(command)
      } catch (error) {
        if (error.message === 'BOOK_ALREADY_EXISTS') {
          logger.info('Book already exists, skipping:', error.message)
        } else {
          logger.error(`Error processing record #${processedCount}:`, error)
        }

        skippedCount++
      }
    }

    dbService.disconnect().catch(logger.error)
    stream.destroy()

    logger.info('Disconnected from MongoDB and destroyed stream.')

    logger.info(`
      Import Summary:
      ---------------
      CSV rows read: ${processedCount}
      Records skipped: ${skippedCount}
    `)

    return
  } catch (error) {
    logger.error('Fatal error in seeding process:', error)
  }

  return
}

/**
 * Creates an instance of BookService with its dependencies (repository and event bus).
 * Adjust this function according to your dependency injection mechanism.
 */
async function getBookService(
  dbService: MongoDatabaseService,
): Promise<CreateBookHandler> {
  // Connect to the database.
  await dbService.connect()

  const bookRepository = new BookWriteRepository(
    dbService.getCollection<DomainEvent>('event_store'),
    dbService,
  )

  const eventBus = new RabbitMQEventBus(
    process.env.BOOK_SERVICE_NAME || 'book_service',
  )

  // Initialize the event bus if needed.
  if (typeof eventBus.init === 'function') {
    await eventBus.init()
  }

  // Bind the event types to the event bus.
  // This is necessary to ensure that the event bus can handle the events correctly.
  await eventBus.bindEventTypes([BOOK_CREATED, BOOK_UPDATED, BOOK_DELETED])

  // Create and return the BookService instance.
  return new CreateBookHandler(bookRepository, eventBus)
}

seedBooks().catch(logger.error)
