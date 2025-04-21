import { schemas } from '@book-library-tool/api'
import { EventResponse } from '@book-library-tool/sdk'
import { BookReturnHandler } from '@reservations/commands/BookReturnHandler.js'
import { FastifyRequest } from 'fastify'

export class ReturnReservationController {
  constructor(private readonly returnReservationHandler: BookReturnHandler) {
    // Bind methods to ensure the correct "this" context when used as callbacks
    this.returnReservation = this.returnReservation.bind(this)
  }

  /**
   * PATCH /reservations/:id/return
   * Mark a reservation as returned.
   * Generates a ReservationReturned event, persists it, and publishes it.
   */
  async returnReservation(
    request: FastifyRequest<{ Params: schemas.IdParameter }>,
  ): Promise<EventResponse & { id: string }> {
    const { id } = request.params

    // Execute the command directly through the handler
    const result = await this.returnReservationHandler.execute({
      id,
    })

    return result
  }
}
