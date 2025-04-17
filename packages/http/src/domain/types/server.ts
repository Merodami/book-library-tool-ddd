import { ICacheService } from '@book-library-tool/redis/src/domain/repositories/ICacheService.js'

import { HealthCheckConfig } from './healthCheck.js'

export interface ApiTokenOptions {
  /**
   * The secret key used to verify the API token.
   */
  secret: string

  /**
   * The name of the header that contains the API token.
   */
  headerName?: string

  /**
   * The paths that should be excluded from authentication.
   */
  excludePaths?: string[]
}

export interface ServerOptions {
  serviceName: string
  port: number
  jwtSecret?: string
  rateLimit?: {
    max: number
    timeWindow: string
  }
  healthChecks: HealthCheckConfig[]
  cacheService?: ICacheService
}
