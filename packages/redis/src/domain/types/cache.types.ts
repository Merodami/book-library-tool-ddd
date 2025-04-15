export interface CacheConfig {
  host?: string
  port?: number
  defaultTTL?: number
  retryDelay?: number
  maxRetryDelay?: number
}

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy'
  details: {
    connection: boolean
    latency: number
    errors: number
  }
}

export interface CacheService {
  connect(): Promise<void>
  disconnect(): Promise<void>
  get<T>(key: string): Promise<T | null>
  set(key: string, value: unknown, ttl?: number): Promise<boolean>
  exists(key: string): Promise<boolean>
  getTTL(key: string): Promise<number>
  updateTTL(key: string, ttl: number): Promise<boolean>
  del(key: string): Promise<boolean>
  delPattern(pattern: string): Promise<number>
  clearAll(): Promise<void>
  checkHealth(): Promise<HealthStatus>
}
