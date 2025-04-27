import { Document } from 'mongodb'

/**
 * Interface for base projection repositories
 * Defines the contract for repositories that handle MongoDB document projections
 *
 * @template TDocument The MongoDB document type
 * @template TDto The data transfer object type
 */
export interface MongoProjectionRepositoryPort<
  _TDocument extends Document,
  _TDto,
> {
  // This interface is intentionally empty as BaseProjectionRepository
  // does not expose any public methods.
  //
  // The implementation only contains protected methods that are meant
  // to be used by derived classes:
  // - getNotDeletedFilter(): Filter<TDocument>
  // - buildCompleteFilter(filter: Filter<TDocument>): Filter<TDocument>
}
