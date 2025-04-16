import { OpenAPIV3 } from 'openapi-types'

import { registry } from '../schemaRegistry.js'

// Environment variables
const HEALTH_CHECK_MEMORY_THRESHOLD = parseInt(
  process.env.HEALTH_CHECK_MEMORY_THRESHOLD || '15',
  10,
)
const BOOKS_API_URL = process.env.BOOKS_API_URL || 'http://localhost:3001'
const RESERVATIONS_API_URL =
  process.env.RESERVATIONS_API_URL || 'http://localhost:3002'
const WALLETS_API_URL = process.env.WALLETS_API_URL || 'http://localhost:3003'
const REDIS_HOST = process.env.REDIS_HOST || 'localhost'
const REDIS_PORT = parseInt(process.env.REDIS_PORT || '6379', 10)
const REDIS_DEFAULT_TTL = parseInt(process.env.REDIS_DEFAULT_TTL || '3600', 10)
const RABBIT_MQ_URL = process.env.RABBIT_MQ_URL || 'localhost'
const RABBIT_MQ_PORT = parseInt(process.env.RABBIT_MQ_PORT || '5672', 10)

/**
 * System API Specification
 */
export const SystemAPISpec: Partial<OpenAPIV3.Document> = {
  paths: {
    '/health': {
      get: {
        tags: ['System'],
        operationId: 'healthCheck',
        summary: 'API health check',
        description: 'Returns health status of the API and its components',
        parameters: [],
        responses: {
          '200': {
            description: 'System health information',
            content: {
              'application/json': {
                schema: registry.ref('HealthCheckResponse'),
                example: {
                  status: 'healthy',
                  timestamp: '2025-04-15T12:00:00.000Z',
                  version: '1.0.0',
                  uptime: 86400,
                  memoryUsage: {
                    rss: 150000000,
                    heapTotal: 70000000,
                    heapUsed: 65000000,
                    external: 15000000,
                    memoryThreshold: 15,
                  },
                  services: {
                    books: {
                      status: 'healthy',
                      url: BOOKS_API_URL,
                      responseTime: 42,
                    },
                    reservations: {
                      status: 'healthy',
                      url: RESERVATIONS_API_URL,
                      responseTime: 38,
                    },
                    wallets: {
                      status: 'healthy',
                      url: WALLETS_API_URL,
                      responseTime: 45,
                    },
                  },
                  databases: {
                    mongodb: {
                      status: 'healthy',
                      url: 'mongodb://****:****@localhost:27017',
                      responseTime: 25,
                      collections: [
                        'books',
                        'reservations',
                        'users',
                        'wallets',
                      ],
                    },
                    redis: {
                      status: 'healthy',
                      host: REDIS_HOST,
                      port: REDIS_PORT,
                      ttl: REDIS_DEFAULT_TTL,
                      responseTime: 5,
                    },
                  },
                  messageQueue: {
                    rabbitmq: {
                      status: 'healthy',
                      host: RABBIT_MQ_URL,
                      port: RABBIT_MQ_PORT,
                      queues: [
                        {
                          name: 'events',
                          messageCount: 0,
                        },
                        {
                          name: 'notifications',
                          messageCount: 5,
                        },
                      ],
                    },
                  },
                },
              },
            },
          },
          '500': { $ref: '#/components/responses/InternalServerError' },
        },
        security: [],
      },
    },
    '/docs': {
      get: {
        tags: ['System'],
        operationId: 'getDocs',
        summary: 'API Documentation',
        description: 'Returns the OpenAPI documentation in JSON format',
        responses: {
          '200': {
            description: 'OpenAPI documentation',
            content: {
              'application/json': {
                schema: registry.ref('APIDocsResponse'),
              },
            },
          },
          '500': { $ref: '#/components/responses/InternalServerError' },
        },
        security: [],
      },
    },
  },
}
