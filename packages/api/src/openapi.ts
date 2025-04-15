import { OpenAPIV3 } from 'openapi-types'

import {
  paramBookId,
  paramCatalogAuthor,
  paramCatalogFields,
  paramCatalogISBN,
  paramCatalogPrice,
  paramCatalogPriceMax,
  paramCatalogPriceMin,
  paramCatalogPublicationYear,
  paramCatalogPublicationYearMax,
  paramCatalogPublicationYearMin,
  paramCatalogPublisher,
  paramCatalogSortBy,
  paramCatalogSortOrder,
  paramCatalogTitle,
  paramPaginationLimit,
  paramPaginationPage,
  paramReservationId,
  paramUserId,
} from './parameters/index.js'
import {
  BookCreateRequestSchema,
  BookIdSchema,
  BookSchema,
  BookUpdateRequestSchema,
  ErrorResponseSchema,
  LateReturnRequestSchema,
  PaginatedBookResponseSchema,
  PaginatedReservationResponseSchema,
  PaginatedResultSchema,
  PaginatedUserResponseSchema,
  PaginationQuerySchema,
  ReservationRequestSchema,
  ReservationReturnParamsSchema,
  ReservationReturnResponseSchema,
  ReservationSchema,
  ReservationsHistoryQuerySchema,
  UserIdSchema,
  UserSchema,
  WalletBalanceRequestSchema,
  WalletSchema,
} from './schemas/index.js'

export const OpenAPISpec = {
  openapi: '3.0.0',
  info: {
    title: 'Book Library Tool API',
    version: '1.0.0',
    description:
      'API for managing book references, catalog search, reservations, and wallets.',
  },
  paths: {
    '/catalog': {
      servers: [
        {
          url: 'http://localhost:3001',
          description: 'Books Service',
        },
      ],
      get: {
        summary: 'Search for books in the catalog',
        description:
          'Allows searching for books with various filters, sorting, and field selection. Supports exact matches, partial matches, and range queries.',
        parameters: [
          paramCatalogTitle,
          paramCatalogAuthor,
          paramCatalogPublicationYear,
          paramCatalogISBN,
          paramCatalogPublisher,
          paramCatalogPrice,
          paramCatalogPublicationYearMin,
          paramCatalogPublicationYearMax,
          paramCatalogPriceMin,
          paramCatalogPriceMax,
          paramCatalogSortBy,
          paramCatalogSortOrder,
          paramCatalogFields,
          paramPaginationPage,
          paramPaginationLimit,
        ],
        responses: {
          '200': {
            description:
              'A paginated list of books matching the search criteria',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/PaginatedBookResponse' },
                examples: {
                  paginatedBooks: {
                    summary:
                      'Example paginated book results with field selection',
                    value: {
                      data: [
                        {
                          title: 'The Target',
                          author: 'Catherine Coulter',
                          isbn: '0515125628',
                        },
                      ],
                      pagination: {
                        total: 25,
                        page: 1,
                        limit: 10,
                        pages: 3,
                        hasNext: true,
                        hasPrev: false,
                      },
                    },
                  },
                  fullResults: {
                    summary: 'Example with all fields',
                    value: {
                      data: [
                        {
                          isbn: '0515125628',
                          title: 'The Target',
                          author: 'Catherine Coulter',
                          publicationYear: 1999,
                          publisher: 'Jove Books',
                          price: 27,
                          createdAt: '2025-04-01T19:10:25.821Z',
                          updatedAt: '2025-04-01T19:10:25.821Z',
                        },
                      ],
                      pagination: {
                        total: 25,
                        page: 1,
                        limit: 10,
                        pages: 3,
                        hasNext: true,
                        hasPrev: false,
                      },
                    },
                  },
                  emptyResults: {
                    summary: 'No results found',
                    value: {
                      data: [],
                      pagination: {
                        total: 0,
                        page: 1,
                        limit: 10,
                        pages: 0,
                        hasNext: false,
                        hasPrev: false,
                      },
                    },
                  },
                },
              },
            },
          },
          '400': {
            description: 'Bad Request',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
                examples: {
                  invalidYear: {
                    summary: 'Invalid publication year range',
                    value: {
                      error: 'ValidationError',
                      message:
                        'publicationYearMin must be less than publicationYearMax',
                    },
                  },
                  invalidPrice: {
                    summary: 'Invalid price range',
                    value: {
                      error: 'ValidationError',
                      message: 'priceMin must be less than priceMax',
                    },
                  },
                  invalidSort: {
                    summary: 'Invalid sort parameters',
                    value: {
                      error: 'ValidationError',
                      message: 'sortBy must be a valid field name',
                    },
                  },
                  invalidFields: {
                    summary: 'Invalid field selection',
                    value: {
                      error: 'ValidationError',
                      message: 'fields must contain valid field names',
                    },
                  },
                },
              },
            },
          },
        },
        security: [{ ApiTokenAuth: [] }],
      },
    },
    '/books': {
      servers: [
        {
          url: 'http://localhost:3001',
          description: 'Books Service',
        },
      ],
      post: {
        summary: 'Add a new book reference',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/BookCreateRequest' },
              examples: {
                theTarget: {
                  summary: 'The Target by Catherine Coulter',
                  value: {
                    id: '0515125628',
                    title: 'The Target',
                    author: 'Catherine Coulter',
                    publicationYear: 1999,
                    publisher: 'Jove Books',
                    price: 27,
                  },
                },
                evolutionMan: {
                  summary: 'The Evolution Man or How I Ate My Father',
                  value: {
                    id: '0515125628',
                    title: 'The Evolution Man or How I Ate My Father',
                    author: 'Roy Lewis',
                    publicationYear: 1993,
                    publisher: 'Random House Inc',
                    price: 19,
                  },
                },
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'Book reference created',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Book' },
                examples: {
                  theTarget: {
                    summary: 'The Target by Catherine Coulter',
                    value: {
                      id: '0515125628',
                      title: 'The Target',
                      author: 'Catherine Coulter',
                      publicationYear: 1999,
                      publisher: 'Jove Books',
                      price: 27,
                      createdAt: '2025-04-01T19:10:25.821Z',
                      updatedAt: '2025-04-01T19:10:25.821Z',
                    },
                  },
                  evolutionMan: {
                    summary: 'The Evolution Man or How I Ate My Father',
                    value: {
                      id: '0679427279',
                      title: 'The Evolution Man or How I Ate My Father',
                      author: 'Roy Lewis',
                      publicationYear: 1993,
                      publisher: 'Random House Inc',
                      price: 19,
                    },
                  },
                },
              },
            },
          },
          '400': {
            description: 'Bad Request',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
                examples: {
                  invalidFormat: {
                    summary: 'Invalid book data format',
                    value: {
                      error: 'ValidationError',
                      message: ['publicationYear must be number'],
                    },
                  },
                },
              },
            },
          },
        },
        security: [{ ApiTokenAuth: [] }],
      },
    },
    '/books/{isbn}': {
      servers: [
        {
          url: 'http://localhost:3001',
          description: 'Books Service',
        },
      ],
      get: {
        summary: 'Get book by reference id',
        parameters: [paramBookId],
        responses: {
          '200': {
            description: 'Book found',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Book' },
                examples: {
                  bookFound: {
                    summary: 'Book found successfully',
                    value: {
                      id: '0515125628',
                      title: 'The Target',
                      author: 'Catherine Coulter',
                      publicationYear: 1999,
                      publisher: 'Jove Books',
                      price: 27,
                    },
                  },
                },
              },
            },
          },
          '404': {
            description: 'Book not found',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
                examples: {
                  bookNotFound: {
                    summary: 'Book not found',
                    value: {
                      error: 'ValidationError',
                      message: 'Book not found.',
                    },
                  },
                },
              },
            },
          },
        },
        security: [{ ApiTokenAuth: [] }],
      },
      patch: {
        summary: 'Update a book reference',
        parameters: [paramBookId],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/BookUpdateRequest' },
              examples: {
                updateBook: {
                  summary: 'Update book details',
                  value: {
                    title: 'The Target - Updated Edition',
                    author: 'Catherine Coulter',
                    publicationYear: 2000,
                    publisher: 'Jove Books',
                    price: 29.99,
                  },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Book updated successfully',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Book' },
                examples: {
                  updatedBook: {
                    summary: 'Book updated successfully',
                    value: {
                      id: '0515125628',
                      title: 'The Target - Updated Edition',
                      author: 'Catherine Coulter',
                      publicationYear: 2000,
                      publisher: 'Jove Books',
                      price: 29.99,
                      createdAt: '2025-04-01T19:10:25.821Z',
                      updatedAt: '2025-04-02T10:15:30.456Z',
                    },
                  },
                },
              },
            },
          },
          '400': {
            description: 'Bad Request',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
                examples: {
                  invalidData: {
                    summary: 'Invalid update data',
                    value: {
                      error: 'ValidationError',
                      message: ['publicationYear must be a number'],
                    },
                  },
                },
              },
            },
          },
          '404': {
            description: 'Book not found',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
                examples: {
                  bookNotFound: {
                    summary: 'Book not found',
                    value: {
                      error: 'ValidationError',
                      message: 'Book with ISBN 9999999999 not found.',
                    },
                  },
                },
              },
            },
          },
        },
        security: [{ ApiTokenAuth: [] }],
      },
      delete: {
        summary: 'Delete a book reference by id',
        parameters: [paramBookId],
        responses: {
          '200': {
            description: 'Book reference deleted successfully',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Book' },
                examples: {
                  deletedBook: {
                    summary: 'Book deleted successfully',
                  },
                },
              },
            },
          },
          '404': {
            description: 'Book not found',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
                examples: {
                  bookNotFound: {
                    summary: 'Book not found',
                    value: {
                      error: 'ValidationError',
                      message: ['Book with ID 9999999999 not found'],
                    },
                  },
                },
              },
            },
          },
          '400': {
            description: 'Bad Request',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
                examples: {
                  invalidId: {
                    summary: 'Invalid book ID',
                    value: {
                      message: 'Invalid book ID format.',
                    },
                  },
                },
              },
            },
          },
        },
        security: [{ ApiTokenAuth: [] }],
      },
    },
    '/reservations': {
      servers: [
        {
          url: 'http://localhost:3001',
          description: 'Books Service',
        },
      ],
      post: {
        summary: 'Create a new reservation',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ReservationRequest' },
              examples: {
                newReservation: {
                  summary: 'New reservation request',
                  value: {
                    userId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
                    referenceId: '0515125628',
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
                schema: { $ref: '#/components/schemas/Reservation' },
                examples: {
                  createdReservation: {
                    summary: 'Reservation created successfully',
                    value: {
                      reservationId: 'f7e6d5c4-b3a2-1098-7654-321fedcba012',
                      userId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
                      referenceId: '0515125628',
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
          '400': {
            description: 'Bad Request',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
                examples: {
                  reservationExists: {
                    summary: 'Active reservation exists',
                    value: {
                      message:
                        'User already has an active reservation for this book reference.',
                    },
                  },
                  bookNotAvailable: {
                    summary: 'No copies available',
                    value: {
                      message: 'No copies available for this book reference.',
                    },
                  },
                  userMaxBooks: {
                    summary: 'User has maximum books',
                    value: {
                      message:
                        'User cannot borrow more than 3 books at the same time.',
                    },
                  },
                  insufficientBalance: {
                    summary: 'Insufficient wallet balance',
                    value: {
                      message:
                        'User does not have enough balance to reserve a book.',
                    },
                  },
                },
              },
            },
          },
        },
        security: [{ ApiTokenAuth: [] }],
      },
    },
    '/reservations/user/{userId}': {
      servers: [
        {
          url: 'http://localhost:3001',
          description: 'Books Service',
        },
      ],
      get: {
        summary: 'Get reservation history for a user',
        parameters: [paramUserId, paramPaginationPage, paramPaginationLimit],
        responses: {
          '200': {
            description: 'Paginated reservation history for the user',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/PaginatedReservationResponse',
                },
                examples: {
                  userReservations: {
                    summary: 'User reservation history',
                    value: {
                      data: [
                        {
                          reservationId: 'f7e6d5c4-b3a2-1098-7654-321fedcba012',
                          userId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
                          referenceId: '0515125628',
                          reservedAt: '2025-04-01T12:30:45.678Z',
                          dueDate: '2025-04-06T12:30:45.678Z',
                          status: 'reserved',
                          feeCharged: 3,
                        },
                        {
                          reservationId: '11223344-5566-7788-99aa-bbccddeeff00',
                          userId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
                          referenceId: '0679427279',
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
          '400': {
            description: 'Bad Request',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
                examples: {
                  invalidUserId: {
                    summary: 'userId must match format "uuid"',
                    value: {
                      error: 'ValidationError',
                      message: ['userId must match format "uuid"'],
                    },
                  },
                  invalidPagination: {
                    summary: 'Invalid pagination parameters',
                    value: {
                      error: 'ValidationError',
                      message: [
                        'page must be a positive integer',
                        'limit must not exceed 100',
                      ],
                    },
                  },
                },
              },
            },
          },
        },
        security: [{ ApiTokenAuth: [] }],
      },
    },
    '/reservations/{reservationId}/return': {
      servers: [
        {
          url: 'http://localhost:3001',
          description: 'Books Service',
        },
      ],
      patch: {
        summary: 'Mark a reservation as returned',
        parameters: [paramReservationId],
        responses: {
          '200': {
            description: 'Reservation marked as returned',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ReservationReturnResponse',
                },
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
                      late_fee_applied: '0.6',
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
          '400': {
            description: 'Bad Request',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
                examples: {
                  invalidReservationId: {
                    summary: 'Invalid reservation ID',
                    value: {
                      error: 'ValidationError',
                      message: ['reservationId must match format "uuid"'],
                    },
                  },
                },
              },
            },
          },
          '404': {
            description: 'Reservation not found',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
                examples: {
                  reservationNotFound: {
                    summary: 'Reservation not found',
                    value: {
                      error: 'ValidationError',
                      message: ['Active reservation not found'],
                    },
                  },
                },
              },
            },
          },
        },
        security: [{ ApiTokenAuth: [] }],
      },
    },
    '/wallets/{userId}': {
      servers: [
        {
          url: 'http://localhost:3002',
          description: 'Wallet Service',
        },
      ],
      get: {
        summary: 'Retrieve a user wallet',
        parameters: [paramUserId],
        responses: {
          '200': {
            description: 'User wallet details',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Wallet' },
                examples: {
                  userWallet: {
                    summary: 'User wallet information',
                    value: {
                      userId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
                      balance: 50.5,
                    },
                  },
                },
              },
            },
          },
          '400': {
            description: 'Bad Request',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
                examples: {
                  invalidUserId: {
                    summary: 'User not found',
                    value: {
                      error: 'ValidationError',
                      message: ['userId must match format "uuid".'],
                    },
                  },
                },
              },
            },
          },
          '404': {
            description: 'Wallet not found',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
                examples: {
                  walletNotFound: {
                    summary: 'Wallet not found',
                    value: {
                      error: 'ValidationError',
                      message: ['Wallet for user not found'],
                    },
                  },
                },
              },
            },
          },
        },
        security: [{ ApiTokenAuth: [] }],
      },
    },
    '/wallets/{userId}/balance': {
      servers: [
        {
          url: 'http://localhost:3002',
          description: 'Wallet Service',
        },
      ],
      post: {
        summary: 'Modify balance of a user wallet',
        parameters: [paramUserId],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/BalanceWalletRequest' },
              examples: {
                addFunds: {
                  summary: 'Add funds to wallet',
                  value: {
                    amount: 20,
                  },
                },
                deductFunds: {
                  summary: 'Deduct funds from wallet',
                  value: {
                    amount: -3,
                  },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Wallet updated successfully',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Wallet' },
                examples: {
                  updatedWallet: {
                    summary: 'Updated wallet balance',
                    value: {
                      userId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
                      balance: 20,
                    },
                  },
                },
              },
            },
          },
          '400': {
            description: 'Bad Request',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
                examples: {
                  invalidAmount: {
                    summary: 'Invalid amount',
                    value: {
                      error: 'ValidationError',
                      message: ['amount must be a number'],
                    },
                  },
                },
              },
            },
          },
        },
        security: [{ ApiTokenAuth: [] }],
      },
    },
    '/wallets/{userId}/late-return': {
      servers: [
        {
          url: 'http://localhost:3002',
          description: 'Wallet Service',
        },
      ],
      patch: {
        summary: 'Apply a late fee to a user wallet',
        parameters: [paramUserId],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/LateReturnRequest' },
              examples: {
                lateFee: {
                  summary: 'Late return fee calculation',
                  value: {
                    daysLate: 5,
                    retailPrice: 36,
                  },
                },
                longOverdue: {
                  summary: 'Long overdue book',
                  value: {
                    daysLate: 120,
                    retailPrice: 42.99,
                  },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description:
              'Late fee applied. If fees reach or exceed the retail price, the book is considered brought.',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    message: { type: 'string' },
                    wallet: { $ref: '#/components/schemas/Wallet' },
                  },
                },
                examples: {
                  feeApplied: {
                    summary: 'Late fee applied',
                    value: {
                      message:
                        'Late fee of €1.00 applied for 5 days late return.',
                      wallet: {
                        userId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
                        balance: 49.5,
                        createdAt: '2025-01-15T08:30:00.000Z',
                        updatedAt: '2025-04-01T15:30:10.789Z',
                      },
                    },
                  },
                  bookBrought: {
                    summary: 'Book considered brought due to high late fees',
                    value: {
                      message:
                        'Late fees of €19.00 exceed or equal book retail price. Book marked as brought.',
                      wallet: {
                        userId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
                        balance: 31.5,
                        createdAt: '2025-01-15T08:30:00.000Z',
                        updatedAt: '2025-04-01T15:35:22.345Z',
                      },
                    },
                  },
                },
              },
            },
          },
          '400': {
            description: 'Bad Request',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
                examples: {
                  invalidData: {
                    summary: 'Invalid request data',
                    value: {
                      error: 'ValidationError',
                      message: [
                        'daysLate must be provided',
                        'retailPrice must be provided',
                      ],
                    },
                  },
                },
              },
            },
          },
        },
        security: [{ ApiTokenAuth: [] }],
      },
    },
  },
  components: {
    schemas: {
      ErrorResponse: ErrorResponseSchema,
      UserId: UserIdSchema,

      // Book schemas
      Book: BookSchema,
      BookId: BookIdSchema,
      BookCreateRequest: BookCreateRequestSchema,
      BookUpdateRequest: BookUpdateRequestSchema,

      // Reservation schemas
      Reservation: ReservationSchema,
      ReservationRequest: ReservationRequestSchema,
      ReservationReturnResponse: ReservationReturnResponseSchema,
      ReservationsHistoryQuery: ReservationsHistoryQuerySchema,
      ReservationReturnParams: ReservationReturnParamsSchema,

      // Wallet schemas
      Wallet: WalletSchema,
      BalanceWalletRequest: WalletBalanceRequestSchema,
      LateReturnRequest: LateReturnRequestSchema,
      User: UserSchema,

      // Pagination schemas
      PaginatedBookResponse: PaginatedBookResponseSchema,
      PaginatedReservationResponse: PaginatedReservationResponseSchema,
      PaginatedUserResponse: PaginatedUserResponseSchema,
      PaginationQuery: PaginationQuerySchema,
      PaginatedResult: PaginatedResultSchema,

      // Query schemas
      CatalogSearchQuery: {
        type: 'object',
        properties: {
          title: { type: 'string', minLength: 1 },
          author: { type: 'string', minLength: 1 },
          isbn: { type: 'string', minLength: 1 },
          publicationYear: { type: 'number' },
          publisher: { type: 'string', minLength: 1 },
          price: { type: 'number' },
          available: { type: 'boolean' },
          publicationYearMin: { type: 'number' },
          publicationYearMax: { type: 'number' },
          priceMin: { type: 'number' },
          priceMax: { type: 'number' },
          skip: { type: 'number', minimum: 0 },
          limit: {
            type: 'number',
            minimum: 1,
            maximum: parseInt(process.env.PAGINATION_MAX_LIMIT ?? '100'),
            default: parseInt(process.env.PAGINATION_DEFAULT_LIMIT ?? '10'),
          },
          sortBy: { type: 'string' },
          sortOrder: {
            type: 'string',
            enum: ['ASC', 'DESC'],
          },
          fields: {
            type: 'array',
            items: { type: 'string' },
          },
        },
      },
    },
    parameters: {
      paramPaginationLimit,
      paramPaginationPage,
      paramCatalogTitle,
      paramCatalogAuthor,
      paramCatalogPublicationYear,
      paramBookId,
      paramUserId,
      paramReservationId,
    },
    securitySchemes: {
      ApiTokenAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Enter your JWT token for authentication',
      },
    },
  },
} as unknown as OpenAPIV3.Document
