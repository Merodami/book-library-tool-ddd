import { ErrorCode, Errors } from '@shared/errors/index.js'
import { getSystemDetails } from '@shared/infrastructure/health/systemCheck.js'
import {
  HealthCheckDependency,
  HealthStatus,
  ServiceHealth,
  SystemHealth,
} from '@shared/infrastructure/health/types.js'
import logger from '@shared/infrastructure/logger/Logger.js'

/**
 * Executes health checks for all dependencies
 * @param dependencies List of health check dependencies to check
 * @param startTime Service start time for uptime calculation
 * @returns Array of service health results
 */
export async function executeHealthChecks(
  dependencies: HealthCheckDependency[],
  startTime: number,
): Promise<ServiceHealth[]> {
  if (!dependencies || !Array.isArray(dependencies)) {
    throw new Errors.ApplicationError(
      500,
      ErrorCode.HEALTH_CHECK_INVALID_DEPENDENCIES,
      'Invalid health check dependencies configuration',
    )
  }

  const services: ServiceHealth[] = []

  for (const dependency of dependencies) {
    if (
      !dependency ||
      !dependency.name ||
      typeof dependency.check !== 'function'
    ) {
      throw new Errors.ApplicationError(
        500,
        ErrorCode.HEALTH_CHECK_INVALID_DEPENDENCY,
        `Invalid health check dependency: ${dependency?.name || 'unknown'}`,
      )
    }

    try {
      // Execute the health check
      const isHealthy = await dependency.check()

      let details = { ...dependency.details }

      // Add additional system details for system checks
      if (dependency.name === 'system') {
        details = {
          ...details,
          ...getSystemDetails(startTime),
        }
      }

      // Add the result
      services.push({
        name: dependency.name,
        status: isHealthy ? 'healthy' : 'unhealthy',
        details,
      })
    } catch (error) {
      // Handle execution errors
      logger.debug(`Health check for ${dependency.name} failed:`, error)

      services.push({
        name: dependency.name,
        status: 'unhealthy',
        message: error instanceof Error ? error.message : String(error),
      })
    }
  }

  return services
}

/**
 * Determines overall system health status based on service health results
 * @param services Array of service health results
 * @returns The overall health status
 */
export function determineOverallStatus(
  services: ServiceHealth[],
): HealthStatus {
  if (!services || !Array.isArray(services)) {
    throw new Errors.ApplicationError(
      500,
      ErrorCode.HEALTH_CHECK_INVALID_SERVICES,
      'Invalid service health results',
    )
  }

  if (services.length === 0) {
    return 'healthy' // Default when no services are checked
  }

  if (services.every((service) => service.status === 'unhealthy')) {
    return 'unhealthy'
  }

  if (services.some((service) => service.status === 'unhealthy')) {
    return 'degraded'
  }

  return 'healthy'
}

/**
 * Builds a complete health report
 * @param services Array of service health results
 * @param startTime Service start time for uptime calculation
 * @param version Service version
 * @returns Complete system health report
 */
export function buildHealthReport(
  services: ServiceHealth[],
  startTime: number,
  version: string,
): SystemHealth {
  if (!services || !Array.isArray(services)) {
    throw new Errors.ApplicationError(
      500,
      ErrorCode.HEALTH_CHECK_INVALID_SERVICES,
      'Invalid service health results',
    )
  }

  if (typeof startTime !== 'number' || startTime <= 0) {
    throw new Errors.ApplicationError(
      500,
      ErrorCode.HEALTH_CHECK_INVALID_STARTTIME,
      'Invalid service start time',
    )
  }

  if (!version) {
    throw new Errors.ApplicationError(
      500,
      ErrorCode.HEALTH_CHECK_INVALID_VERSION,
      'Service version is required',
    )
  }

  const overallStatus = determineOverallStatus(services)

  return {
    status: overallStatus,
    services,
    timestamp: new Date().toISOString(),
    version,
    uptime: Math.floor((Date.now() - startTime) / 1000),
  }
}

/**
 * Filters dependencies to only critical ones
 * @param dependencies List of all dependencies
 * @returns List of critical dependencies
 */
export function getCriticalDependencies(
  dependencies: HealthCheckDependency[],
): HealthCheckDependency[] {
  if (!dependencies || !Array.isArray(dependencies)) {
    throw new Errors.ApplicationError(
      500,
      ErrorCode.HEALTH_CHECK_INVALID_DEPENDENCIES,
      'Invalid health check dependencies configuration',
    )
  }

  const criticalDeps = dependencies.filter(
    (d) => d.name === 'database' || d.details?.essential === true,
  )

  return criticalDeps.length > 0 ? criticalDeps : dependencies
}
