import { MongoDatabaseService } from '@book-library-tool/database'
import { RabbitMQEventBus } from '@book-library-tool/event-store'
import { Book } from '@book-library-tool/sdk'
import fastcsv from 'fast-csv'
import fs from 'fs'
import he from 'he'
import path from 'path'
import { fileURLToPath } from 'url'

import { CreateBookHandler } from '../application/use_cases/commands/CreateBookHandler.js'
import { BookRepository } from '../infrastructure/persistence/mongo/BookRepository.js'

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
        console.log(`Record #${processedCount}:`, record)
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
          console.log(
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
          console.log('Book already exists, skipping:', error.message)
        } else {
          console.error(`Error processing record #${processedCount}:`, error)
        }

        skippedCount++
      }
    }

    dbService.disconnect().catch(console.error)
    stream.destroy()

    console.log('Disconnected from MongoDB and destroyed stream.')

    console.log(`
      Import Summary:
      ---------------
      CSV rows read: ${processedCount}
      Records skipped: ${skippedCount}
    `)

    return
  } catch (error) {
    console.error('Fatal error in seeding process:', error)
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

  const bookRepository = new BookRepository(dbService)
  const eventBus = new RabbitMQEventBus()

  // Initialize the event bus if needed.
  if (typeof eventBus.init === 'function') {
    await eventBus.init()
  }

  // Create and return the BookService instance.
  return new CreateBookHandler(bookRepository, eventBus)
}

seedBooks().catch(console.error)
