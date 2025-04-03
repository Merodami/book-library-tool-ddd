import fs from 'fs'
import path from 'path'
import { MongoClient } from 'mongodb'
import fastcsv from 'fast-csv'
import { Book } from '@book-library-tool/sdk'
import { fileURLToPath } from 'url'
import { decodeHTMLEntities, decodeText, isInvalidBook } from '../helper.js'

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017'
const DB_NAME = 'books-dev'
const COLLECTION_NAME = 'books' // Must match your initialization script

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

async function seedBooks() {
  let client: MongoClient | undefined

  try {
    // Connect to MongoDB using the native driver
    client = new MongoClient(MONGO_URI)

    await client.connect()

    console.log('Connected to MongoDB.')

    const db = client.db(DB_NAME)
    const booksCollection = db.collection(COLLECTION_NAME)

    // Get count before operation
    const initialCount = await booksCollection.countDocuments()
    console.log(`Initial book count: ${initialCount}`)

    const csvFilePath = path.join(
      __dirname,
      'books_sample_technical_challenge.csv',
    )

    // Set up a stream with fast-csv
    const stream = fs
      .createReadStream(csvFilePath)
      .pipe(fastcsv.parse({ headers: true, ignoreEmpty: true, trim: true }))

    let processedCount = 0
    let skippedCount = 0
    let currentBatch: Book[] = []
    const batchSize = 100

    // Use an async iterator to process records sequentially
    for await (const record of stream) {
      processedCount++
      if (processedCount <= 3) {
        console.log(`Record #${processedCount}:`, record)
      }

      try {
        // Create a new book object. Do NOT set an _id field so MongoDB auto-generates it.
        const book: Book & { createdAt: string; updatedAt: string } = {
          id: String(record.id || ''), // optional, if you need to store CSV id separately
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
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }

        // Validate the book – skip if required fields are missing
        if (isInvalidBook(book)) {
          console.log(
            `Skipping record #${processedCount} due to missing required fields`,
            book,
          )
          skippedCount++
          continue
        }

        currentBatch.push(book)

        // If we've accumulated a full batch, insert it
        if (currentBatch.length >= batchSize) {
          try {
            await booksCollection.insertMany(currentBatch, { ordered: false })
            console.log(`Inserted batch of ${currentBatch.length} books.`)
          } catch (batchError: any) {
            console.error(`Error inserting batch: ${batchError.message}`)
          }
          currentBatch = [] // Reset batch after insertion
        }
      } catch (recordError) {
        console.error(
          `Error processing record #${processedCount}:`,
          recordError,
        )
        skippedCount++
      }
    }

    // Insert any remaining records
    if (currentBatch.length > 0) {
      try {
        await booksCollection.insertMany(currentBatch, { ordered: false })
        console.log(`Inserted final batch of ${currentBatch.length} books.`)
      } catch (err: any) {
        console.error(`Error inserting final batch: ${err.message}`)
      }
    }

    // Print import summary
    const finalCount = await booksCollection.countDocuments()
    console.log(`
      Import Summary:
      ---------------
      CSV rows read: ${processedCount}
      Records skipped: ${skippedCount}
      Records inserted: ${finalCount - initialCount}
      Total books in collection: ${finalCount}
    `)
  } catch (error) {
    console.error('Fatal error in seeding process:', error)
  } finally {
    if (client) {
      await client.close()
      console.log('MongoDB connection closed.')
    }
  }
}

seedBooks().catch(console.error)
