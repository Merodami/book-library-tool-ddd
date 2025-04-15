import {
  HealthCheckDependency,
  type HealthStatus,
  logger,
  type ServiceHealth,
  ServiceHealthCheckOptions,
  type SystemHealth,
} from '@book-library-tool/shared'
import express from 'express'
import os from 'os'

/**
 * Sets up health check endpoints for a service
 * @param app Express application
 * @param dependencies Service dependencies to check
 * @param options Health check options
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
      15,
    ), // Default: less than 15% free memory is unhealthy
  } = options

  const startTime = Date.now()

  // Main health check endpoint
  app.get(healthPath, async (_req, res) => {
    const services: ServiceHealth[] = []
    let overallStatus: HealthStatus = 'healthy'

    // Check each service dependency
    for (const dependency of dependencies) {
      try {
        const isHealthy = await dependency.check()

        services.push({
          name: dependency.name,
          status: isHealthy ? 'healthy' : 'unhealthy',
          details: dependency.details,
        })

        if (!isHealthy && overallStatus === 'healthy') {
          overallStatus = 'degraded'
        }
      } catch (error) {
        services.push({
          name: dependency.name,
          status: 'unhealthy',
          message: error instanceof Error ? error.message : String(error),
        })

        if (overallStatus === 'healthy') {
          overallStatus = 'degraded'
        }
      }
    }

    // Check system resources
    const memoryUsage = process.memoryUsage()
    const freeMemoryPercentage = (os.freemem() / os.totalmem()) * 100
    const isMemoryHealthy = freeMemoryPercentage > memoryThreshold

    services.push({
      name: 'system',
      status: isMemoryHealthy ? 'healthy' : 'unhealthy',
      details: {
        memory: {
          free: `${Math.round(freeMemoryPercentage)}%`,
          heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB`,
          rss: `${Math.round(memoryUsage.rss / 1024 / 1024)}MB`,
        },
        uptime: Math.floor((Date.now() - startTime) / 1000), // in seconds
      },
    })

    if (!isMemoryHealthy && overallStatus === 'healthy') {
      overallStatus = 'degraded'
    }

    // If all services are unhealthy, mark as unhealthy
    if (services.every((service) => service.status === 'unhealthy')) {
      overallStatus = 'unhealthy'
    }

    const health: SystemHealth = {
      status: overallStatus,
      services,
      timestamp: new Date().toISOString(),
      version,
      uptime: Math.floor((Date.now() - startTime) / 1000),
    }

    const statusCode = overallStatus === 'unhealthy' ? 503 : 200

    res.status(statusCode).json(health)
  })

  // Liveness probe - simple endpoint that always returns 200 if app is running
  app.get(`${healthPath}/liveness`, (_req, res) => {
    res.status(200).json({
      status: 'healthy' as HealthStatus,
      service: serviceName,
      timestamp: new Date().toISOString(),
    })
  })

  // Readiness probe - indicates if service is ready to receive traffic
  app.get(`${healthPath}/readiness`, async (_req, res) => {
    // For readiness, find critical dependencies marked as essential
    const criticalDependencies = dependencies.filter(
      (d) => d.name === 'database' || d.details?.essential === true,
    )

    let isReady = true

    // If no critical dependencies defined, check all
    const depsToCheck =
      criticalDependencies.length > 0 ? criticalDependencies : dependencies

    // Check critical dependencies
    for (const dependency of depsToCheck) {
      try {
        const isHealthy = await dependency.check()
        if (!isHealthy) {
          isReady = false
          break
        }
      } catch (error) {
        logger.debug(`Readiness check failed for ${dependency.name}:`, error)
        isReady = false
        break
      }
    }

    const status: HealthStatus = isReady ? 'healthy' : 'unhealthy'
    const statusCode = isReady ? 200 : 503

    res.status(statusCode).json({
      status,
      service: serviceName,
      timestamp: new Date().toISOString(),
    })
  })

  logger.info(`Health check endpoints configured at ${healthPath}`)
}
