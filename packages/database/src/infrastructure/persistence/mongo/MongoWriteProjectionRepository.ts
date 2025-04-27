import { Errors } from '@book-library-tool/shared'
import { MongoProjectionRepository } from '@database/infrastructure/index.js'
import { MongoWriteProjectionRepositoryPort } from '@database/port/index.js'
import { DocumentMapper } from '@database/shared/index.js'
import { pick } from 'lodash-es'
import {
  Collection,
  Document,
  Filter,
  ObjectId,
  OptionalUnlessRequiredId,
} from 'mongodb'

/**
 * Base repository for MongoDB projection operations
 * Provides common CRUD functionality with projections support
 */
export abstract class MongoWriteProjectionRepository<
    TDocument extends Document,
    TDto,
  >
  extends MongoProjectionRepository<TDocument, TDto>
  implements MongoWriteProjectionRepositoryPort<TDocument, TDto>
{
  /**
   * Constructs a new base projection repository
   * @param collection - MongoDB collection
   * @param mapToDto - Function to map MongoDB documents to DTOs
   */
  constructor(
    protected readonly collection: Collection<TDocument>,
    protected readonly mapToDto: DocumentMapper<TDocument, TDto>,
  ) {
    super(collection, mapToDto)
  }

  /**
   * Generic method to save a projection document
   * @param dtoData - DTO to save
   * @param mapToDocument - Function to map DTO to document
   */
  async saveProjection(
    dtoData: TDto,
    mapToDocument: (dto: TDto) => Omit<TDocument, '_id'>,
  ): Promise<void> {
    const doc = mapToDocument(dtoData)

    await this.collection.insertOne({
      ...doc,
      _id: new ObjectId(),
    } as OptionalUnlessRequiredId<TDocument>)
  }

  /**
   * Generic method to update specific fields of a projection
   * @param id - Document ID
   * @param changes - Partial changes to apply
   * @param allowedFields - Array of field names that are allowed to be updated
   * @param updatedAt - Update timestamp
   * @param errorCode - Error code to use if document not found
   * @param errorMessage - Error message to use if document not found
   */
  async updateProjection<T extends TDto>(
    id: string,
    changes: Partial<T>,
    allowedFields: Array<keyof T>,
    updatedAt: Date | string,
    errorCode: string,
    errorMessage: string,
  ): Promise<void> {
    const picked = pick(changes, allowedFields)

    // Create an object that will be compatible with MongoDB's typing
    const setFields: Partial<Record<string, unknown>> = {
      ...picked,
      updatedAt: updatedAt instanceof Date ? updatedAt : new Date(updatedAt),
    }

    if (Object.keys(setFields).length === 0) {
      return
    }

    // Create a filter object and use a type predicate to ensure it's properly typed
    const idFilter: Record<string, unknown> = { id }
    const filter = this.buildCompleteFilter(idFilter as Filter<TDocument>)

    const result = await this.collection.updateOne(filter, {
      $set: setFields as Partial<TDocument>,
    })

    if (result.matchedCount === 0) {
      throw new Errors.ApplicationError(404, errorCode, errorMessage)
    }
  }
}
