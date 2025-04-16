import { registry } from './schemaRegistry.js'
import {
  BookCreateRequestSchema,
  BookIdParameterSchema,
  BookSchema,
  BookUpdateRequestSchema,
  PaginatedBookResponseSchema,
} from './schemas/books.js'
import { CatalogSearchQuerySchema } from './schemas/catalog.js'
import { ErrorResponseSchema } from './schemas/errors.js'
import {
  PaginatedResultSchema,
  PaginationMetadataSchema,
  PaginationQuerySchema,
} from './schemas/pagination.js'
import {
  PaginatedReservationResponseSchema,
  ReservationIdParameterSchema,
  ReservationRequestSchema,
  ReservationReturnResponseSchema,
  ReservationSchema,
  ReservationsHistoryQuerySchema,
} from './schemas/reservations.js'
import {
  APIDocsResponseSchema,
  DatabasesHealthSchema,
  HealthCheckResponseSchema,
  HealthStatusSchema,
  MemoryUsageSchema,
  MessageQueueHealthSchema,
  MongoDBHealthSchema,
  QueueSchema,
  RabbitMQHealthSchema,
  RedisHealthSchema,
  ServiceHealthSchema,
  ServicesHealthSchema,
} from './schemas/system.js'
import {
  PaginatedUserResponseSchema,
  UserIdParameterSchema,
  UserSchema,
} from './schemas/users.js'
import {
  LateReturnRequestSchema,
  WalletBalanceRequestSchema,
  WalletSchema,
} from './schemas/wallets.js'

// Books schemas
registry.register('Book', BookSchema)
registry.register('BookCreateRequest', BookCreateRequestSchema)
registry.register('BookUpdateRequest', BookUpdateRequestSchema)
registry.register('PaginatedBookResponse', PaginatedBookResponseSchema)

// Catalog schemas
registry.register('CatalogSearchQuery', CatalogSearchQuerySchema)

// Errors schemas
registry.register('ErrorResponse', ErrorResponseSchema)

// Pagination schemas
registry.register('PaginationMetadata', PaginationMetadataSchema)
registry.register('PaginationQuery', PaginationQuerySchema)
registry.register('PaginatedResult', PaginatedResultSchema)

// Reservations schemas
registry.register('Reservation', ReservationSchema)
registry.register('ReservationsHistoryQuery', ReservationsHistoryQuerySchema)
registry.register('ReservationRequest', ReservationRequestSchema)
registry.register('ReservationIdParameter', ReservationIdParameterSchema)
registry.register('ReservationReturnResponse', ReservationReturnResponseSchema)
registry.register(
  'PaginatedReservationResponse',
  PaginatedReservationResponseSchema,
)

// System schemas
registry.register('HealthStatus', HealthStatusSchema)
registry.register('HealthCheckResponse', HealthCheckResponseSchema)
registry.register('APIDocsResponse', APIDocsResponseSchema)
registry.register('MemoryUsage', MemoryUsageSchema)
registry.register('ServiceHealth', ServiceHealthSchema)
registry.register('ServicesHealth', ServicesHealthSchema)
registry.register('MongoDBHealth', MongoDBHealthSchema)
registry.register('RedisHealth', RedisHealthSchema)
registry.register('DatabasesHealth', DatabasesHealthSchema)
registry.register('Queue', QueueSchema)
registry.register('RabbitMQHealth', RabbitMQHealthSchema)
registry.register('MessageQueueHealth', MessageQueueHealthSchema)

// Users schemas
registry.register('User', UserSchema)
registry.register('PaginatedUserResponse', PaginatedUserResponseSchema)

// Wallets schemas
registry.register('Wallet', WalletSchema)
registry.register('WalletBalanceRequest', WalletBalanceRequestSchema)
registry.register('LateReturnRequest', LateReturnRequestSchema)

// Parameter schemas
registry.register('BookIdParameter', BookIdParameterSchema)
registry.register('UserIdParameter', UserIdParameterSchema)
