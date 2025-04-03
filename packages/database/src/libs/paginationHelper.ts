import { Collection, Document, Filter, WithId } from 'mongodb'
import { Request } from 'express'
import { DatabaseService } from '../databaseService.js'
import { PaginatedResponse } from '@book-library-tool/types'

/**
 * Helper function to fetch paginated data from any collection
 * Can be used from any handler
 */
export async function getPaginatedData<T extends Document = Document>(
  collection: Collection<T>,
  query: Filter<T> = {},
  req: Request,
  options?: {
    projection?: Record<string, number>
    sort?: Record<string, 1 | -1>
  },
): Promise<PaginatedResponse<WithId<T>>> {
  // Get pagination parameters from request (added by middleware)
  const { page, limit } = req.pagination

  // Use the DatabaseService's paginateCollection method
  return DatabaseService.paginateCollection(
    collection,
    query,
    { page, limit },
    options,
  )
}
