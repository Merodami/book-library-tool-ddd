import { ErrorResponseSchema } from './responses/errors.js'
import { registry } from './schemaRegistry.js'
import {
  BookCreateRequestSchema,
  BookFieldSchema,
  BookSchema,
  BookSortFieldSchema,
  BookUpdateRequestSchema,
} from './schemas/books.js'
import { CatalogSearchQuerySchema } from './schemas/catalog.js'
import { EventResponseSchema } from './schemas/events.js'
import {
  PaginatedResultSchema,
  PaginationMetadataSchema,
} from './schemas/pagination.js'
import {
  ReservationFieldSchema,
  ReservationRequestSchema,
  ReservationReturnResponseSchema,
  ReservationSchema,
  ReservationsHistoryQuerySchema,
  ReservationSortFieldSchema,
} from './schemas/reservations.js'
import { IdParameterSchema } from './schemas/shared.js'
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
import { UserSchema } from './schemas/users.js'
import {
  LateReturnRequestSchema,
  WalletBalanceRequestSchema,
  WalletFieldSchema,
  WalletSchema,
  WalletSearchQuerySchema,
  WalletSortFieldSchema,
} from './schemas/wallets.js'

// Books schemas
registry.register('Book', BookSchema)
registry.register('BookCreateRequest', BookCreateRequestSchema)
registry.register('BookUpdateRequest', BookUpdateRequestSchema)
registry.register('BookSortField', BookSortFieldSchema)
registry.register('BookField', BookFieldSchema)

// Catalog schemas
registry.register('CatalogSearchQuery', CatalogSearchQuerySchema)

// Errors schemas
registry.register('ErrorResponse', ErrorResponseSchema)

// Pagination schemas
registry.register('PaginationMetadata', PaginationMetadataSchema)
registry.register('PaginatedResult', PaginatedResultSchema)

// Reservations schemas
registry.register('Reservation', ReservationSchema)
registry.register('ReservationsHistoryQuery', ReservationsHistoryQuerySchema)
registry.register('ReservationRequest', ReservationRequestSchema)
registry.register('ReservationReturnResponse', ReservationReturnResponseSchema)
registry.register('ReservationSortField', ReservationSortFieldSchema)
registry.register('ReservationField', ReservationFieldSchema)

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

// Wallets schemas
registry.register('Wallet', WalletSchema)
registry.register('WalletBalanceRequest', WalletBalanceRequestSchema)
registry.register('LateReturnRequest', LateReturnRequestSchema)
registry.register('WalletField', WalletFieldSchema)
registry.register('WalletSortField', WalletSortFieldSchema)
registry.register('WalletSearchQuery', WalletSearchQuerySchema)

// Parameter schemas
registry.register('IdParameter', IdParameterSchema)

// Event schemas
registry.register('EventResponse', EventResponseSchema)
