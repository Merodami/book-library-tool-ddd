import {
  PaginatedReservationResponse,
  ReservationRequest,
  ReservationReturnParams,
  User,
} from '@book-library-tool/sdk'
import { PaginatedQuery } from '@book-library-tool/types'
import { CreateReservationHandler } from '@commands/CreateReservationHandler.js'
import { ReturnReservationHandler } from '@commands/ReturnReservationHandler.js'
import { GetReservationHistoryHandler } from '@use_cases/queries/GetReservationHistoryHandler.js'

/**
 * The ReservationFacade serves as a unified interface for reservation operations.
 * It delegates commands and queries to the appropriate handlers.
 */
export class ReservationFacade {
  constructor(
    private readonly createReservationHandler: CreateReservationHandler,
    private readonly returnReservationHandler: ReturnReservationHandler,
    private readonly getReservationHistoryHandler: GetReservationHistoryHandler,
  ) {}

  /**
   * Creates a new reservation by delegating to the CreateReservationHandler.
   *
   * @param command - The reservation request data
   * @returns The newly created reservation
   */
  async createReservation(command: ReservationRequest): Promise<void> {
    await this.createReservationHandler.execute(command)
  }

  /**
   * Marks a reservation as returned by delegating to the ReturnReservationHandler.
   *
   * @param command - Contains the reservationId to return
   * @returns The updated reservation
   */
  async returnReservation(command: ReservationReturnParams): Promise<void> {
    await this.returnReservationHandler.execute(command)
  }

  /**
   * Retrieves a user's reservation history by delegating to the GetReservationHistoryHandler.
   * This is a query operation that uses the projection repository.
   *
   * @param query - Contains userId and optional filters
   * @returns Paginated list of the user's reservations
   */
  async getReservationHistory(
    query: Pick<User, 'userId'> & PaginatedQuery,
  ): Promise<PaginatedReservationResponse> {
    return this.getReservationHistoryHandler.execute(query)
  }
}
