import { Router } from 'express'
import { catalogHandler } from './catalogHandler.js'
import { schemas, validateQuery } from '@book-library-tool/api'
import { paginationMiddleware } from '@book-library-tool/sdk'

export default Router().get(
  '/',
  validateQuery(schemas.CatalogSearchQuerySchema),
  paginationMiddleware(),
  catalogHandler.searchCatalog,
)
