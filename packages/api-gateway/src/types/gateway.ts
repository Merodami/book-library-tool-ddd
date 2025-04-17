/**
 * Configuration interface for the API Gateway
 *
 * @interface ApiGatewayConfig
 * @property {Object} rateLimit - Rate limiting configuration
 * @property {number} rateLimit.windowMs - Time window in milliseconds for rate limiting
 * @property {number} rateLimit.max - Maximum number of requests allowed in the time window
 * @property {Object} security - Security-related configuration
 * @property {boolean} security.enableHelmet - Whether to enable Helmet security headers
 * @property {boolean} security.enableCors - Whether to enable CORS
 * @property {boolean} security.enableCompression - Whether to enable response compression
 * @property {Object} healthCheck - Health check configuration
 * @property {string} healthCheck.path - Path for health check endpoints
 * @property {number} healthCheck.interval - Interval in milliseconds for health checks
 */
export interface ApiGatewayConfig {
  rateLimit: {
    windowMs: number
    max: number
  }
  security: {
    enableHelmet: boolean
    enableCors: boolean
    enableCompression: boolean
  }
  healthCheck: {
    path: string
    interval: number
  }
}
