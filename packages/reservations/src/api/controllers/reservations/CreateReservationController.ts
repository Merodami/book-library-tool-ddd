import type { ReservationRequest } from '@book-library-tool/sdk'
import { CreateReservationHandler } from '@reservations/commands/CreateReservationHandler.js'
import { FastifyReply, FastifyRequest } from 'fastify'

export class CreateReservationController {
  constructor(
    private readonly createReservationHandler: CreateReservationHandler,
  ) {
    // Bind methods to ensure the correct "this" context when used as callbacks
    this.createReservation = this.createReservation.bind(this)
  }

  /**
   * POST /reservations
   * Create a new reservation.
   * Expects a JSON body with:
   * {
   *   "userId": string,
   *   "isbn": string
   * }
   * The handler will generate a ReservationCreated event, persist it, and publish it.
   */
  async createReservation(
    request: FastifyRequest<{ Body: ReservationRequest }>,
    reply: FastifyReply,
  ): Promise<void> {
    const { userId, isbn } = request.body

    // Build the command
    const reservationCommand: ReservationRequest = {
      userId,
      isbn,
    }

    // Directly delegate to the handler which enforces business rules and generates events
    await this.createReservationHandler.execute(reservationCommand)

    await reply
      .status(201)
      .send({ success: true, message: 'Reservation created successfully' })
  }
}
