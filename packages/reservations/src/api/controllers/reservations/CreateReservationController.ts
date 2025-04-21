import { schemas } from '@book-library-tool/api'
import { CreateReservationHandler } from '@reservations/commands/CreateReservationHandler.js'
import { CreateReservationCommand } from '@reservations/use_cases/commands/CreateReservationCommand.js'
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
   *   "isbn": string
   * }
   * Generates a ReservationCreated event, persists it, and publishes it.
   */
  async createReservation(
    request: FastifyRequest<{
      Body: schemas.ReservationRequest
    }>,
  ): Promise<void> {
    const { userId, isbn } = request.body

    const command: CreateReservationCommand = {
      userId,
      isbn,
    }

    await this.createReservationHandler.execute(command)
  }
}
