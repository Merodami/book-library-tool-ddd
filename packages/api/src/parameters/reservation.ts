/**
 * Reservation Parameter for OpenAPI
 */
export const paramReservationId = {
  in: 'path',
  name: 'reservationId',
  description: 'Reservation identifier (UUID)',
  required: true,
  schema: { type: 'string', format: 'uuid' },
  examples: {
    reservationId1: {
      summary: 'Example reservation ID',
      value: 'f7e6d5c4-b3a2-1098-7654-321fedcba012',
    },
  },
}
