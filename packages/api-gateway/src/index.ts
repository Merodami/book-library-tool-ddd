import express, { Express } from 'express'

import { ApiGatewayConfig, loadConfig } from './config'
import { createRateLimiter } from './middlewares/rate-limiter'
import { createSecurityMiddlewares } from './middlewares/security'
import { HealthCheck } from './utils/health-check'

/**
 * API Gateway class that provides common functionality for API services
 */
export class ApiGateway {
  public app: Express
  private config: ApiGatewayConfig
  private healthCheck: HealthCheck

  /**
   * Create a new API Gateway instance
   * @param configOverrides Optional configuration overrides
   */
  constructor(configOverrides?: Partial<ApiGatewayConfig>) {
    this.config = loadConfig(configOverrides)
    this.app = express()
    this.healthCheck = new HealthCheck(this.config)

    // Apply base middleware
    this.app.disable('x-powered-by')
    this.app.use(express.json())

    // Apply security middleware
    this.app.use(...createSecurityMiddlewares(this.config))

    // Register health check
    this.healthCheck.register(this.app)
  }

  /**
   * Apply rate limiting to specific routes
   * @param paths Paths to apply rate limiting to
   * @param customMessage Optional custom message for rate limit exceeded
   */
  public applyRateLimiting(
    paths: string | string[] = '/api',
    customMessage?: string | object,
  ): void {
    const limiter = createRateLimiter(this.config, customMessage)

    if (Array.isArray(paths)) {
      paths.forEach((path) => this.app.use(path, limiter))
    } else {
      this.app.use(paths, limiter)
    }
  }

  /**
   * Register a service with the health check
   * @param name Service name
   * @param checkFn Function that returns a promise resolving to boolean indicating service health
   */
  public registerHealthCheck(
    name: string,
    checkFn: () => Promise<boolean>,
  ): void {
    this.healthCheck.registerService(name, checkFn)
  }

  /**
   * Stop the health check interval
   */
  public stop(): void {
    this.healthCheck.stop()
  }
}

// Export everything for flexibility
export * from './config'
export * from './middlewares/rate-limiter'
export * from './middlewares/security'
export * from './utils/health-check'
