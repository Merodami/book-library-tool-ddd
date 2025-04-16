import './schemaRegistration.js'

import { merge } from 'lodash-es'
import { OpenAPIV3 } from 'openapi-types'

// Import API specs
import { BooksAPISpec } from './routes/books.js'
import { ReservationsAPISpec } from './routes/reservations.js'
import { SystemAPISpec } from './routes/system.js'
import { WalletsAPISpec } from './routes/wallets.js'
// Import registry and error responses
import { registry } from './schemaRegistry.js'
import { ErrorResponses } from './schemas/index.js' // Make sure this exports ErrorResponses

/**
 * Combined OpenAPI Specification with API Gateway
 */
const baseSpec: OpenAPIV3.Document = {
  openapi: '3.0.0',
  info: {
    title: 'Book Library Tool API',
    version: '1.0.0',
    description:
      'API for managing book references, catalog search, reservations, and wallets through an API Gateway.',
  },
  servers: [
    {
      url: 'http://localhost:8000',
      description: 'Development API Gateway',
      variables: {
        environment: {
          default: 'development',
          enum: ['development', 'staging', 'production'],
          description: 'The environment specified in NODE_ENV',
        },
      },
    },
  ],
  tags: [
    {
      name: 'Books',
      description: 'Operations related to book references and catalog',
    },
    {
      name: 'Reservations',
      description: 'Operations related to book reservations and returns',
    },
    {
      name: 'Wallets',
      description: 'Operations related to user wallets and payments',
    },
    {
      name: 'System',
      description:
        'System-level operations like health checks and documentation',
    },
  ],
  paths: {},
  components: {
    responses: {
      UnauthorizedError: ErrorResponses.UnauthorizedError,
      ForbiddenError: ErrorResponses.ForbiddenError,
      NotFoundError: ErrorResponses.NotFoundError,
      BadRequestError: ErrorResponses.BadRequestError,
      ConflictError: ErrorResponses.ConflictError,
      RateLimitError: ErrorResponses.RateLimitError,
      InternalServerError: ErrorResponses.InternalServerError,
    },
    securitySchemes: {
      ApiTokenAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Enter your JWT token for authentication',
      },
      ApiKeyAuth: {
        type: 'apiKey',
        in: 'header',
        name: 'X-API-KEY',
        description: 'API key authentication for external service integrations',
      },
    },
  },
}

// Merge schemas from SchemaRegistry with existing OpenAPI spec
export const OpenAPISpec: OpenAPIV3.Document = merge(
  {}, // Start with empty object to avoid mutating the base
  baseSpec,
  {
    paths: {
      ...(BooksAPISpec.paths || {}),
      ...(ReservationsAPISpec.paths || {}),
      ...(WalletsAPISpec.paths || {}),
      ...(SystemAPISpec.paths || {}),
    },
    components: {
      schemas: {
        ...registry.generateComponents().schemas,
        ...(BooksAPISpec.components?.schemas || {}),
        ...(ReservationsAPISpec.components?.schemas || {}),
        ...(WalletsAPISpec.components?.schemas || {}),
        ...(SystemAPISpec.components?.schemas || {}),
      },
      parameters: {
        ...(BooksAPISpec.components?.parameters || {}),
        ...(ReservationsAPISpec.components?.parameters || {}),
        ...(WalletsAPISpec.components?.parameters || {}),
        ...(SystemAPISpec.components?.parameters || {}),
      },
    },
  },
)
