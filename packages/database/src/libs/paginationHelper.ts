import { PaginatedResult } from '@book-library-tool/types'
import { Collection, Document, Filter, WithId } from 'mongodb'

import { MongoDatabaseService } from '../mongo/MongoDatabaseService.js'

/**
 * Helper function to fetch paginated data from any collection
 * Can be used from any handler
 */
export async function getPaginatedData<T extends Document = Document>(
  dbService: MongoDatabaseService,
  collection: Collection<T>,
  query: Filter<T> = {},
  pagination: {
    page: number
    limit: number
  },
  options?: {
    projection?: Record<string, number>
    sort?: Record<string, 1 | -1>
  },
): Promise<PaginatedResult<WithId<T>>> {
  return dbService.paginateCollection(collection, query, pagination, options)
}
