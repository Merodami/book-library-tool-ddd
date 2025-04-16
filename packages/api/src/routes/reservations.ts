import { OpenAPIV3 } from 'openapi-types'

import {
  paramPaginationLimit,
  paramPaginationPage,
} from '../parameters/pagination.js'
import { paramReservationId } from '../parameters/reservation.js'
import { paramUserId } from '../parameters/user.js'
import { registry } from '../schemaRegistry.js'

// Environment variables
const LATE_FEE_PER_DAY = parseFloat(process.env.LATE_FEE_PER_DAY || '0.2')

/**
 * Reservations API Specification
 */
export const ReservationsAPISpec: Partial<OpenAPIV3.Document> = {
  paths: {
    '/api/reservations': {
      post: {
        tags: ['Reservations'],
        operationId: 'createReservation',
        summary: 'Create a new reservation',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: registry.ref('ReservationRequest'),
              examples: {
                newReservation: {
                  summary: 'New reservation request',
                  value: {
                    userId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
                    isbn: '0515125628',
                  },
                },
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'Reservation created',
            content: {
              'application/json': {
                schema: registry.ref('Reservation'),
                examples: {
                  createdReservation: {
                    summary: 'Reservation created successfully',
                    value: {
                      reservationId: 'f7e6d5c4-b3a2-1098-7654-321fedcba012',
                      userId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
                      isbn: '0515125628',
                      reservedAt: '2025-04-01T12:30:45.678Z',
                      dueDate: '2025-04-06T12:30:45.678Z',
                      status: 'reserved',
                      feeCharged: 3,
                    },
                  },
                },
              },
            },
          },
          '400': { $ref: '#/components/responses/BadRequestError' },
          '401': { $ref: '#/components/responses/UnauthorizedError' },
          '404': { $ref: '#/components/responses/NotFoundError' },
        },
        security: [{ ApiTokenAuth: [] }],
      },
    },
    '/api/reservations/user/{userId}': {
      get: {
        tags: ['Reservations'],
        operationId: 'getUserReservations',
        summary: 'Get reservation history for a user',
        parameters: [paramUserId, paramPaginationPage, paramPaginationLimit],
        responses: {
          '200': {
            description: 'Paginated reservation history for the user',
            content: {
              'application/json': {
                schema: registry.ref('PaginatedReservationResponse'),
                examples: {
                  userReservations: {
                    summary: 'User reservation history',
                    value: {
                      data: [
                        {
                          reservationId: 'f7e6d5c4-b3a2-1098-7654-321fedcba012',
                          userId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
                          isbn: '0515125628',
                          reservedAt: '2025-04-01T12:30:45.678Z',
                          dueDate: '2025-04-06T12:30:45.678Z',
                          status: 'reserved',
                          feeCharged: 3,
                        },
                        {
                          reservationId: '11223344-5566-7788-99aa-bbccddeeff00',
                          userId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
                          isbn: '0679427279',
                          reservedAt: '2025-03-15T09:20:33.456Z',
                          dueDate: '2025-03-20T09:20:33.456Z',
                          status: 'returned',
                          feeCharged: 3,
                          updatedAt: '2025-03-19T14:25:10.789Z',
                        },
                      ],
                      pagination: {
                        total: 5,
                        page: 1,
                        limit: 10,
                        pages: 1,
                        hasNext: false,
                        hasPrev: false,
                      },
                    },
                  },
                },
              },
            },
          },
          '400': { $ref: '#/components/responses/BadRequestError' },
          '401': { $ref: '#/components/responses/UnauthorizedError' },
          '404': { $ref: '#/components/responses/NotFoundError' },
        },
        security: [{ ApiTokenAuth: [] }],
      },
    },
    '/api/reservations/{reservationId}/return': {
      patch: {
        tags: ['Reservations'],
        operationId: 'returnBook',
        summary: 'Mark a reservation as returned',
        parameters: [paramReservationId],
        responses: {
          '200': {
            description: 'Reservation marked as returned',
            content: {
              'application/json': {
                schema: registry.ref('ReservationReturnResponse'),
                examples: {
                  onTimeReturn: {
                    summary: 'Book returned on time',
                    value: {
                      message: 'Reservation marked as returned.',
                      late_fee_applied: '0.0',
                      days_late: 0,
                    },
                  },
                  lateReturn: {
                    summary: 'Book returned late',
                    value: {
                      message: 'Reservation marked as returned.',
                      late_fee_applied: (LATE_FEE_PER_DAY * 3).toString(),
                      days_late: 3,
                    },
                  },
                  bookBrought: {
                    summary: 'Book considered brought due to high late fees',
                    value: {
                      message: 'Book considered brought due to high late fees.',
                      late_fee_applied: '27.0',
                      days_late: 135,
                    },
                  },
                },
              },
            },
          },
          '400': { $ref: '#/components/responses/BadRequestError' },
          '401': { $ref: '#/components/responses/UnauthorizedError' },
          '404': { $ref: '#/components/responses/NotFoundError' },
        },
        security: [{ ApiTokenAuth: [] }],
      },
    },
  },
  components: {
    parameters: {
      reservationId: paramReservationId,
      userId: paramUserId,
      page: paramPaginationPage,
      limit: paramPaginationLimit,
    },
  },
}
