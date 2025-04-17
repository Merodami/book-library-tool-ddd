/**
 * Represents a component that will be health-checked
 */
export interface HealthCheckConfig {
  /**
   * Name of the component being checked
   */
  name: string

  /**
   * Function that performs the health check and returns a boolean indicating status
   */
  check: () => Promise<boolean>

  /**
   * Additional information about the component
   */
  details?: {
    /**
     * Type of the component (e.g., 'MongoDB', 'RabbitMQ')
     */
    type: string

    /**
     * Whether the component is essential for the service to function
     */
    essential?: boolean
  }
}

export interface ServiceHealthCheckOptions {
  /**
   * Name of the service being health-checked
   */
  serviceName: string

  /**
   * Version of the service
   */
  version?: string

  /**
   * Path for the health check endpoint (default: "/health")
   */
  healthPath?: string

  /**
   * Percentage of free memory below which is considered unhealthy
   */
  memoryThreshold?: number
}
