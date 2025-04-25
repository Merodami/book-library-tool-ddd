import { schemas } from '@book-library-tool/api'
import { EventResponse } from '@book-library-tool/sdk'
import { CreateReservationCommand } from '@reservations/application/use_cases/commands/CreateReservationCommand.js'
import { CreateReservationHandler } from '@reservations/application/use_cases/commands/CreateReservationHandler.js'
import { FastifyRequest } from 'fastify'

export class CreateReservationController {
  constructor(
    private readonly createReservationHandler: CreateReservationHandler,
  ) {
    // Bind methods to ensure the correct "this" context when used as callbacks
    this.createReservation = this.createReservation.bind(this)
  }

  /**
   * POST /reservations
   * Creates a new reservation using the event-sourced process.
   * Expects a JSON body with:
   * {
   *   "userId": string,
   *   "bookId": string
   * }
   * Generates a ReservationCreated event, persists it, and publishes it.
   */
  async createReservation(
    request: FastifyRequest<{
      Body: schemas.ReservationRequest
    }>,
  ): Promise<EventResponse & { id: string }> {
    const { userId, bookId } = request.body

    const command: CreateReservationCommand = {
      userId,
      bookId,
    }

    const result = await this.createReservationHandler.execute(command)

    return result
  }
}
