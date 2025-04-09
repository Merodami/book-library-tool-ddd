import { Collection, Document, Filter, WithId } from 'mongodb'
import { PaginatedResponse } from '@book-library-tool/types'
import { MongoDatabaseService } from '../mongo/MongoDatabaseService.js'

/**
 * Helper function to fetch paginated data from any collection
 * Can be used from any handler
 */
export async function getPaginatedData<T extends Document = Document>(
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
): Promise<PaginatedResponse<WithId<T>>> {
  const { page, limit } = pagination

  const dbService = new MongoDatabaseService('event')

  await dbService.connect()

  return dbService.paginateCollection(
    collection,
    query,
    { page, limit },
    options,
  )
}
