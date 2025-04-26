import { MongoWriteRepositoryPort } from '@book-library-tool/database'
import type { Book } from '@books/domain/index.js'

/**
 * BookWriteRepository abstracts the persistence and retrieval of domain events
 * for Book aggregates. It ensures optimistic concurrency via version checking.
 */
export interface BookWriteRepositoryPort
  extends MongoWriteRepositoryPort<Book> {}
