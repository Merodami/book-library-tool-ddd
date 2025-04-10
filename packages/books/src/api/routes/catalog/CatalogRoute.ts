import { schemas, validateQuery } from '@book-library-tool/api'
import { CatalogController } from '@controllers/catalog/CatalogController.js'
import { IBookProjectionRepository } from '@repositories/IBookProjectionRepository.js'
import { GetAllBooksHandler } from '@use_cases/queries/GetAllBooksHandler.js'
import { Router } from 'express'

export function createCatalogRouter(
  bookProjectionRepository: IBookProjectionRepository,
) {
  const router = Router()

  const getHandler = new GetAllBooksHandler(bookProjectionRepository)

  const createHandler = new CatalogController(getHandler)

  router.get(
    '/',
    validateQuery(schemas.CatalogSearchQuerySchema),
    createHandler.getAllBooks,
  )

  return router
}
