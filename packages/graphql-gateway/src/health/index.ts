import { Express } from 'express'

import { GraphQLConfig } from '../config/index.js'

interface HealthStatus {
  status: 'healthy' | 'unhealthy'
  timestamp: string
  uptime: number
  memory: {
    rss: number
    heapTotal: number
    heapUsed: number
  }
}

export class HealthCheck {
  private status: HealthStatus
  private config: GraphQLConfig
  private checkInterval: NodeJS.Timeout

  constructor(config: GraphQLConfig) {
    this.config = config
    this.status = this.getInitialStatus()
    this.checkInterval = setInterval(
      () => this.updateStatus(),
      config.healthCheck.interval,
    )
  }

  private getInitialStatus(): HealthStatus {
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
    }
  }

  private updateStatus(): void {
    const memoryUsage = process.memoryUsage()
    const isHealthy = memoryUsage.heapUsed < memoryUsage.heapTotal * 0.9

    this.status = {
      status: isHealthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: memoryUsage,
    }
  }

  public getStatus(): HealthStatus {
    return this.status
  }

  public register(app: Express): void {
    app.get(this.config.healthCheck.path, (req, res) => {
      res.json(this.getStatus())
    })
  }

  public stop(): void {
    clearInterval(this.checkInterval)
  }
}
