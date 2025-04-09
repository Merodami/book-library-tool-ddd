import { Router } from 'express'
import { CatalogController } from '@controllers/catalogController.js'
import { schemas, validateParams } from '@book-library-tool/api'

export function createCatalogRouter(catalogController: CatalogController) {
  const router = Router()

  router.get(
    '/',
    validateParams(schemas.CatalogSearchQuerySchema),
    catalogController.getCatalog,
  )

  return router
}
