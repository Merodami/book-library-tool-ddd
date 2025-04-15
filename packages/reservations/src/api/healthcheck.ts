import { getErrorMessage } from '@book-library-tool/sdk'
import {
  buildHealthReport,
  createSystemHealthCheck,
  ErrorCode,
  Errors,
  executeHealthChecks,
  getCriticalDependencies,
  HealthCheckDependency,
  logger,
  ServiceHealthCheckOptions,
} from '@book-library-tool/shared'
import express from 'express'

/**
 * Sets up health check endpoints for a service
 */
export function setupServiceHealthCheck(
  app: express.Express,
  dependencies: HealthCheckDependency[],
  options: ServiceHealthCheckOptions,
): void {
  const {
    serviceName,
    version = process.env.npm_package_version || '0.0.0',
    healthPath = '/health',
    memoryThreshold = parseInt(
      process.env.HEALTH_CHECK_MEMORY_THRESHOLD ?? '15',
      10,
    ),
  } = options

  const startTime = Date.now()

  // Add system check if not already present
  const hasSystemCheck = dependencies.some((dep) => dep.name === 'system')
  if (!hasSystemCheck) {
    dependencies.push({
      name: 'system',
      check: createSystemHealthCheck(memoryThreshold),
      details: {
        type: 'System Resources',
        memoryThreshold: `${memoryThreshold}%`,
      },
    })
  }

  // Main health check endpoint
  app.get(healthPath, async (_req, res, next) => {
    try {
      if (!dependencies || dependencies.length === 0) {
        throw new Errors.ApplicationError(
          500,
          ErrorCode.HEALTH_CHECK_DEPENDENCIES_MISSING,
          getErrorMessage(ErrorCode.HEALTH_CHECK_DEPENDENCIES_MISSING),
        )
      }

      // Execute all health checks
      const serviceResults = await executeHealthChecks(dependencies, startTime)

      // Build the health report
      const healthReport = buildHealthReport(serviceResults, startTime, version)

      // Return appropriate status code based on health
      const statusCode = healthReport.status === 'unhealthy' ? 503 : 200
      res.status(statusCode).json(healthReport)
    } catch (error) {
      // Pass to error middleware
      next(error)
    }
  })

  // Liveness probe
  app.get(`${healthPath}/liveness`, (_req, res, next) => {
    try {
      res.status(200).json({
        status: 'healthy',
        service: serviceName,
        timestamp: new Date().toISOString(),
      })
    } catch (error) {
      next(error)
    }
  })

  // Readiness probe
  app.get(`${healthPath}/readiness`, async (_req, res, next) => {
    try {
      if (!dependencies || dependencies.length === 0) {
        throw new Errors.ApplicationError(
          500,
          ErrorCode.HEALTH_CHECK_DEPENDENCIES_MISSING,
          getErrorMessage(ErrorCode.HEALTH_CHECK_DEPENDENCIES_MISSING),
        )
      }

      // Get critical dependencies
      const criticalDeps = getCriticalDependencies(dependencies)

      // Execute health checks for critical dependencies
      const serviceResults = await executeHealthChecks(criticalDeps, startTime)

      // Determine overall status
      const overallStatus = serviceResults.some(
        (svc) => svc.status === 'unhealthy',
      )
        ? 'unhealthy'
        : 'healthy'

      // Return appropriate status code
      const statusCode = overallStatus === 'unhealthy' ? 503 : 200

      res.status(statusCode).json({
        status: overallStatus,
        service: serviceName,
        timestamp: new Date().toISOString(),
      })
    } catch (error) {
      // Pass to error middleware
      next(error)
    }
  })

  logger.info(`Health check endpoints configured at ${healthPath}`)
}
