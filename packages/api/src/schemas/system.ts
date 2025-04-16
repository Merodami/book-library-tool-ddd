import { Static, Type } from '@sinclair/typebox'

// Environment variables
const HEALTH_CHECK_MEMORY_THRESHOLD = parseInt(
  process.env.HEALTH_CHECK_MEMORY_THRESHOLD || '15',
  10,
)
const REDIS_HOST = process.env.REDIS_HOST || 'localhost'
const REDIS_PORT = parseInt(process.env.REDIS_PORT || '6379', 10)
const REDIS_DEFAULT_TTL = parseInt(process.env.REDIS_DEFAULT_TTL || '3600', 10)
const RABBIT_MQ_URL = process.env.RABBIT_MQ_URL || 'localhost'
const RABBIT_MQ_PORT = parseInt(process.env.RABBIT_MQ_PORT || '5672', 10)

// --------------------------------
// Schema Definitions
// --------------------------------

/**
 * Health Status Enum Schema
 */
export const HealthStatusSchema = Type.Enum(
  {
    healthy: 'healthy',
    degraded: 'degraded',
    unhealthy: 'unhealthy',
  },
  {
    description: 'Health status of a service or component',
    $id: '#/components/schemas/HealthStatus',
  },
)
export type HealthStatus = Static<typeof HealthStatusSchema>
export const HealthStatusRef = Type.Ref('#/components/schemas/HealthStatus')

/**
 * Memory Usage Schema
 */
export const MemoryUsageSchema = Type.Object(
  {
    rss: Type.Number({
      description: 'Resident Set Size - memory allocated in bytes',
    }),
    heapTotal: Type.Number({
      description: 'Total size of allocated heap in bytes',
    }),
    heapUsed: Type.Number({
      description: 'Actual memory used in bytes',
    }),
    external: Type.Number({
      description: 'Memory used by C++ objects bound to JavaScript',
    }),
    memoryThreshold: Type.Number({
      description: `Memory threshold in percentage (${HEALTH_CHECK_MEMORY_THRESHOLD}%)`,
    }),
  },
  {
    description: 'Memory usage information',
    $id: '#/components/schemas/MemoryUsage',
  },
)
export type MemoryUsage = Static<typeof MemoryUsageSchema>
export const MemoryUsageRef = Type.Ref('#/components/schemas/MemoryUsage')

/**
 * Service Health Schema
 */
export const ServiceHealthSchema = Type.Object(
  {
    status: HealthStatusRef,
    url: Type.String({
      description: 'Service URL',
    }),
    responseTime: Type.Number({
      description: 'Response time in milliseconds',
    }),
  },
  {
    description: 'Health information for a service',
    $id: '#/components/schemas/ServiceHealth',
  },
)
export type ServiceHealth = Static<typeof ServiceHealthSchema>
export const ServiceHealthRef = Type.Ref('#/components/schemas/ServiceHealth')

/**
 * Services Health Schema
 */
export const ServicesHealthSchema = Type.Object(
  {
    books: ServiceHealthRef,
    reservations: ServiceHealthRef,
    wallets: ServiceHealthRef,
  },
  {
    description: 'Health information for all services',
    $id: '#/components/schemas/ServicesHealth',
  },
)
export type ServicesHealth = Static<typeof ServicesHealthSchema>
export const ServicesHealthRef = Type.Ref('#/components/schemas/ServicesHealth')

/**
 * MongoDB Health Schema
 */
export const MongoDBHealthSchema = Type.Object(
  {
    status: HealthStatusRef,
    url: Type.String({
      description: 'Database connection URL (masked)',
    }),
    responseTime: Type.Number({
      description: 'Response time in milliseconds',
    }),
    collections: Type.Array(Type.String(), {
      description: 'Available collections',
    }),
  },
  {
    description: 'MongoDB health information',
    $id: '#/components/schemas/MongoDBHealth',
  },
)
export type MongoDBHealth = Static<typeof MongoDBHealthSchema>
export const MongoDBHealthRef = Type.Ref('#/components/schemas/MongoDBHealth')

/**
 * Redis Health Schema
 */
export const RedisHealthSchema = Type.Object(
  {
    status: HealthStatusRef,
    host: Type.String({
      description: `Redis host (${REDIS_HOST})`,
    }),
    port: Type.Number({
      description: `Redis port (${REDIS_PORT})`,
    }),
    ttl: Type.Number({
      description: `Default TTL (${REDIS_DEFAULT_TTL}s)`,
    }),
    responseTime: Type.Number({
      description: 'Response time in milliseconds',
    }),
  },
  {
    description: 'Redis health information',
    $id: '#/components/schemas/RedisHealth',
  },
)
export type RedisHealth = Static<typeof RedisHealthSchema>
export const RedisHealthRef = Type.Ref('#/components/schemas/RedisHealth')

/**
 * Databases Health Schema
 */
export const DatabasesHealthSchema = Type.Object(
  {
    mongodb: MongoDBHealthRef,
    redis: RedisHealthRef,
  },
  {
    description: 'Health information for all databases',
    $id: '#/components/schemas/DatabasesHealth',
  },
)
export type DatabasesHealth = Static<typeof DatabasesHealthSchema>
export const DatabasesHealthRef = Type.Ref(
  '#/components/schemas/DatabasesHealth',
)

/**
 * Queue Schema
 */
export const QueueSchema = Type.Object(
  {
    name: Type.String({
      description: 'Queue name',
    }),
    messageCount: Type.Number({
      description: 'Number of messages in queue',
    }),
  },
  {
    description: 'Message queue information',
    $id: '#/components/schemas/Queue',
  },
)
export type Queue = Static<typeof QueueSchema>
export const QueueRef = Type.Ref('#/components/schemas/Queue')

/**
 * RabbitMQ Health Schema
 */
export const RabbitMQHealthSchema = Type.Object(
  {
    status: HealthStatusRef,
    host: Type.String({
      description: `RabbitMQ host (${RABBIT_MQ_URL})`,
    }),
    port: Type.Number({
      description: `RabbitMQ port (${RABBIT_MQ_PORT})`,
    }),
    queues: Type.Array(QueueRef, {
      description: 'Queues in RabbitMQ',
    }),
  },
  {
    description: 'RabbitMQ health information',
    $id: '#/components/schemas/RabbitMQHealth',
  },
)
export type RabbitMQHealth = Static<typeof RabbitMQHealthSchema>
export const RabbitMQHealthRef = Type.Ref('#/components/schemas/RabbitMQHealth')

/**
 * Message Queue Health Schema
 */
export const MessageQueueHealthSchema = Type.Object(
  {
    rabbitmq: RabbitMQHealthRef,
  },
  {
    description: 'Health information for message queues',
    $id: '#/components/schemas/MessageQueueHealth',
  },
)
export type MessageQueueHealth = Static<typeof MessageQueueHealthSchema>
export const MessageQueueHealthRef = Type.Ref(
  '#/components/schemas/MessageQueueHealth',
)

/**
 * Health Check Response Schema
 */
export const HealthCheckResponseSchema = Type.Object(
  {
    status: HealthStatusRef,
    timestamp: Type.String({
      format: 'date-time',
      description: 'The current server time',
    }),
    version: Type.String({
      description: 'API version',
    }),
    uptime: Type.Number({
      description: 'Server uptime in seconds',
    }),
    memoryUsage: MemoryUsageRef,
    services: ServicesHealthRef,
    databases: DatabasesHealthRef,
    messageQueue: MessageQueueHealthRef,
  },
  {
    description: 'Health check response',
    $id: '#/components/schemas/HealthCheckResponse',
  },
)
export type HealthCheckResponse = Static<typeof HealthCheckResponseSchema>
export const HealthCheckResponseRef = Type.Ref(
  '#/components/schemas/HealthCheckResponse',
)

/**
 * API Documentation Response Schema
 */
export const APIDocsResponseSchema = Type.Object(
  {
    openapi: Type.String(),
    info: Type.Object({}),
    paths: Type.Object({}),
    components: Type.Object({}),
  },
  {
    description: 'OpenAPI documentation',
    additionalProperties: true,
    $id: '#/components/schemas/APIDocsResponse',
  },
)
export type APIDocsResponse = Static<typeof APIDocsResponseSchema>
export const APIDocsResponseRef = Type.Ref(
  '#/components/schemas/APIDocsResponse',
)
