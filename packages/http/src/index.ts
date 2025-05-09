export { setupServiceHealthCheck } from './application/api/healthCheck.js'
export { createFastifyServer, startServer } from './application/api/server.js'
export type { HealthCheckConfig } from './domain/types/healthCheck.js'
export type { ServerOptions } from './domain/types/server.js'
export { fastifyAuth } from './infrastructure/fastify/middleware/auth.js'
export { fastifyErrorMiddleware } from './infrastructure/fastify/middleware/errorHandler.js'
export { paginationHook } from './infrastructure/fastify/middleware/pagination.js'
export {
  makeValidator,
  parseAndValidate,
  validateBody,
  validateParams,
  validateQuery,
} from './infrastructure/fastify/validation/validation.js'
