import { Type } from '@sinclair/typebox'
import { OpenAPIV3 } from 'openapi-types'

// --------------------------------
// OpenAPI Parameters
// --------------------------------

/**
 * Reservation Parameter for OpenAPI
 */
export const paramReservationId: OpenAPIV3.ParameterObject = {
  in: 'path',
  name: 'reservationId',
  description: 'Reservation identifier (UUID)',
  required: true,
  schema: Type.String({ format: 'uuid' }),
  examples: {
    reservationId1: {
      summary: 'Example reservation ID',
      value: 'f7e6d5c4-b3a2-1098-7654-321fedcba012',
    },
  },
}
