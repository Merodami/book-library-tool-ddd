import { MongoProjectionRepositoryPort } from '@database/port/index.js'
import { Document } from 'mongodb'

/**
 * Interface for write-only projection repositories
 * Provides creation and update operations for projection documents
 */
export interface MongoWriteProjectionRepositoryPort<
  TDocument extends Document,
  TDto,
> extends MongoProjectionRepositoryPort<TDocument, TDto> {
  /**
   * Generic method to save a projection document
   *
   * @param dtoData DTO to save
   * @param mapToDocument Function to map DTO to document
   * @returns Promise that resolves when the operation completes
   */
  saveProjection(
    dtoData: TDto,
    mapToDocument: (dto: TDto) => Omit<TDocument, '_id'>,
  ): Promise<void>

  /**
   * Generic method to update specific fields of a projection
   *
   * @param id Document ID
   * @param changes Partial changes to apply
   * @param allowedFields Array of field names that are allowed to be updated
   * @param updatedAt Update timestamp
   * @param errorCode Error code to use if document not found
   * @param errorMessage Error message to use if document not found
   * @returns Promise that resolves when the operation completes
   * @throws ApplicationError if the document is not found
   */
  updateProjection<T extends TDto>(
    id: string,
    changes: Partial<T>,
    allowedFields: Array<keyof T>,
    updatedAt: Date | string,
    errorCode: string,
    errorMessage: string,
  ): Promise<void>
}
