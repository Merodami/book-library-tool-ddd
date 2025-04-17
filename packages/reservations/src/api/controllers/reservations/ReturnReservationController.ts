import { schemas } from '@book-library-tool/api'
import { BookReturnHandler } from '@reservations/commands/BookReturnHandler.js'
import { FastifyReply, FastifyRequest } from 'fastify'

export class ReturnReservationController {
  constructor(private readonly returnReservationHandler: BookReturnHandler) {
    // Bind methods to ensure the correct "this" context when used as callbacks
    this.returnReservation = this.returnReservation.bind(this)
  }

  /**
   * PATCH /reservations/:reservationId/return
   * Mark a reservation as returned.
   * Generates a ReservationReturned event, persists it, and publishes it.
   */
  async returnReservation(
    request: FastifyRequest<{ Params: schemas.ReservationIdParameter }>,
    reply: FastifyReply,
  ): Promise<void> {
    const { reservationId } = request.params

    // Execute the command directly through the handler
    await this.returnReservationHandler.execute({
      reservationId,
    })

    await reply.status(200).send({
      success: true,
      message: 'Reservation returned successfully',
    })
  }
}
