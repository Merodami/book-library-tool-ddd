import amqplib from 'amqplib'
import { v4 as uuidv4 } from 'uuid'

import type { DomainEvent } from './domain/DomainEvent.js'
import type { EventBus } from './EventBus.js'

/**
 * RabbitMQEventBus implements the EventBus interface using RabbitMQ.
 */
export class RabbitMQEventBus implements EventBus {
  private connection!: any // Bypass TypeScript strict typing for simplicity.
  private channel!: any
  // Use environment variable for the exchange name; this is where events are published.
  private readonly exchangeName = process.env.EVENTS_EXCHANGE || 'events'
  private queueName!: string
  // Local registry for event handlers.
  private handlers: Map<string, Array<(event: DomainEvent) => Promise<void>>> =
    new Map()
  // Pending subscriptions before initialization.
  private pendingSubscriptions: Array<{
    eventType: string
    handler: (event: DomainEvent) => Promise<void>
  }> = []
  // Flags to track initialization.
  private initialized = false
  private initializing = false
  private shuttingDown = false
  private reconnectAttempts = 0
  private readonly maxReconnectAttempts = 10

  constructor(
    private serviceName: string,
    private rabbitMQUrl: string = getRabbitMQUrl(),
  ) {}

  /**
   * Initializes the RabbitMQ connection, channel, exchange, and queue without consuming.
   */
  async init(): Promise<void> {
    if (this.initialized) {
      return
    }

    if (this.initializing) {
      while (this.initializing) {
        await new Promise((resolve) => setTimeout(resolve, 100))
      }
      return
    }

    this.initializing = true

    try {
      // Connect to RabbitMQ
      this.connection = await amqplib.connect(this.rabbitMQUrl)

      // Declare exchange
      this.channel = await this.connection.createChannel()
      this.setupConnectionHandlers()

      // Set prefetch count
      await this.channel.prefetch(50)

      // Declare exchanges
      await this.channel.assertExchange(this.exchangeName, 'topic', {
        durable: true,
        autoDelete: false,
      })

      const deadLetterExchange = `${this.exchangeName}.deadletter`
      await this.channel.assertExchange(deadLetterExchange, 'topic', {
        durable: true,
        autoDelete: false,
      })

      // Generate a service-specific queue name
      const environment = process.env.ENVIRONMENT || 'development'
      const queueName = `${this.serviceName}.${environment}.queue`

      // ***** IMPORTANT CHANGE: Don't try to check the queue *****
      // Instead, directly create the queue with all needed parameters
      const { queue } = await this.channel.assertQueue(queueName, {
        durable: true,
        exclusive: false,
        autoDelete: false,
        arguments: {
          'x-dead-letter-exchange': deadLetterExchange,
          'x-message-ttl': 1000 * 60 * 60 * 24 * 7,
          'x-max-length': 1000000,
          'x-queue-mode': 'default',
        },
      })

      this.queueName = queue

      // Create and bind dead letter queue
      const dlqName = `${this.queueName}.deadletter`
      await this.channel.assertQueue(dlqName, {
        durable: true,
        exclusive: false,
        autoDelete: false,
      })

      await this.channel.bindQueue(dlqName, deadLetterExchange, '#')

      // Process pending subscriptions
      for (const { eventType, handler } of this.pendingSubscriptions) {
        this.subscribeNow(eventType, handler)
      }

      this.pendingSubscriptions = []
      this.initialized = true

      console.log(
        `RabbitMQEventBus initialized. Exchange: ${this.exchangeName}, Queue: ${this.queueName}`,
      )
    } catch (error) {
      console.error('Failed to initialize RabbitMQEventBus:', error)

      // Important: If initialization fails, attempt to close connections
      try {
        if (this.channel) {
          await this.channel.close().catch(() => {}) // Ignore errors if already closed
        }
        if (this.connection) {
          await this.connection.close().catch(() => {}) // Ignore errors if already closed
        }
      } catch (closeError) {
        console.error(
          'Error during cleanup after failed initialization:',
          closeError,
        )
      }

      throw error
    } finally {
      this.initializing = false
    }
  }

  /**
   * Start consuming messages from the queue.
   * This should be called explicitly when the application is ready to process messages.
   */
  async startConsuming(): Promise<void> {
    if (!this.initialized) {
      await this.init()
    }

    // Configure robust consumer with retry policies
    await this.channel.consume(
      this.queueName,
      async (msg: any) => {
        if (!msg) return

        const messageId = msg.properties.messageId
        const routingKey = msg.fields.routingKey

        try {
          console.debug(`Processing message ${messageId} [${routingKey}]`)

          // Track processing metrics
          const startTime = Date.now()

          // Process the message
          await this.handleMessage(msg)

          // Log processing time for monitoring
          const processingTime = Date.now() - startTime
          console.debug(`Processed message ${messageId} in ${processingTime}ms`)
        } catch (error) {
          console.error(`Error processing message ${messageId}:`, error)

          // Get message headers or create new ones
          const headers = msg.properties.headers || {}

          // Check retry count, retry up to 3 times before sending to DLQ
          const retryCount = (headers['x-retry-count'] || 0) + 1

          if (retryCount <= 3) {
            // Retry with exponential backoff
            const delay = 1000 * Math.pow(2, retryCount - 1)
            console.info(
              `Retrying message ${messageId} (${retryCount}/3) after ${delay}ms`,
            )

            // Update headers with retry info
            headers['x-retry-count'] = retryCount
            headers['x-last-retry-reason'] = error.message

            // Setup for delayed retry using RabbitMQ's dead-letter + TTL pattern
            const retryQueueName = `${this.queueName}.retry.${retryCount}`
            await this.channel.assertQueue(retryQueueName, {
              durable: true,
              arguments: {
                'x-message-ttl': delay,
                'x-dead-letter-exchange': this.exchangeName,
                'x-dead-letter-routing-key': routingKey,
              },
            })

            // Publish to retry queue with delay
            this.channel.publish('', retryQueueName, msg.content, {
              ...msg.properties,
              headers,
            })

            // Acknowledge original message
            this.channel.ack(msg)
          } else {
            // Send to dead-letter queue after max retries
            console.warn(
              `Message ${messageId} exceeded retry limit, sending to DLQ`,
            )
            this.channel.nack(msg, false, false)
          }
        }
      },
      { noAck: false },
    )

    console.info(`Started consuming messages from queue: ${this.queueName}`)
  }

  private setupConnectionHandlers(): void {
    this.connection.on('error', (err: any) => {
      console.error('RabbitMQ connection error:', err)
      this.reconnect()
    })

    this.connection.on('close', () => {
      if (!this.shuttingDown) {
        console.warn('RabbitMQ connection closed unexpectedly')
        this.reconnect()
      }
    })

    this.channel.on('error', (err: any) => {
      console.error('RabbitMQ channel error:', err)
    })

    this.channel.on('close', () => {
      console.warn('RabbitMQ channel closed')
    })
  }

  async reconnect(): Promise<void> {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached, giving up')
      // Trigger application alert/restart
      process.exit(1)
      return
    }

    this.reconnectAttempts++
    const delay = Math.min(30000, 1000 * Math.pow(2, this.reconnectAttempts))

    console.info(
      `Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`,
    )

    await new Promise((resolve) => setTimeout(resolve, delay))

    try {
      this.initialized = false
      await this.init()
      this.reconnectAttempts = 0
      console.info('Successfully reconnected to RabbitMQ')
    } catch (error) {
      console.error('Failed to reconnect:', error)
      this.reconnect()
    }
  }

  /**
   * Internal method to handle incoming messages.
   */
  private async handleMessage(msg: any): Promise<void> {
    if (!msg) return

    try {
      const content = msg.content.toString()
      const event: DomainEvent = JSON.parse(content)
      const routingKey = msg.fields.routingKey

      // Retrieve both specific handlers and global handlers.
      const specificHandlers = this.handlers.get(routingKey) || []
      const globalHandlers = this.handlers.get('*') || []
      const allHandlers = [...specificHandlers, ...globalHandlers]

      for (const handler of allHandlers) {
        await handler(event)
      }

      // Acknowledge message processing.
      this.channel.ack(msg)
    } catch (error) {
      console.error('Error handling message:', error)
      // Nack the message so it can be retried or sent to dead-letter.
      this.channel.nack(msg, false, false)
    }
  }

  /**
   * Publishes a domain event using the event's eventType as the routing key.
   */
  async publish(event: DomainEvent): Promise<void> {
    if (!this.initialized) {
      await this.init()
    }

    const routingKey = event.eventType
    const messageBuffer = Buffer.from(JSON.stringify(event))

    // Add enterprise-level message properties
    const properties = {
      persistent: true,
      messageId: event.aggregateId || uuidv4(),
      timestamp: Date.now(),
      appId: this.serviceName,
      headers: {
        'x-source-service': this.serviceName,
        'x-environment': process.env.ENVIRONMENT || 'production',
        'x-correlation-id': event.metadata?.correlationId || 'none',
        'x-event-version': event.version || '1.0',
      },
      mandatory: true, // This tells RabbitMQ to return un-routable messages
    }

    const published = this.channel.publish(
      this.exchangeName,
      routingKey,
      messageBuffer,
      properties,
    )

    // Set up a return handler
    this.channel.on('return', (msg: any) => {
      console.error(
        `Message was returned from server: ${msg.fields.routingKey}`,
      )
      console.error('This means no queue was bound to receive it!')
    })

    // Implement back pressure if channel buffer is full
    if (!published) {
      await new Promise((resolve) => this.channel.once('drain', resolve))
    }

    console.info(`Published event [${routingKey}] ID: ${properties.messageId}`)
  }

  /**
   * Registers a handler for a specific event type.
   * Queues the subscription if the bus is not initialized.
   */
  subscribe(
    eventType: string,
    handler: (event: DomainEvent) => Promise<void>,
  ): void {
    if (!this.initialized) {
      this.pendingSubscriptions.push({ eventType, handler })
      if (!this.initializing) {
        this.init().catch((error) => {
          console.error('Failed to initialize during subscribe:', error)
        })
      }
      return
    }

    this.subscribeNow(eventType, handler)
  }

  /**
   * Internal method to subscribe when the channel is ready.
   */
  private subscribeNow(
    eventType: string,
    handler: (event: DomainEvent) => Promise<void>,
  ): void {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, [])
      const bindingKey = eventType === '*' ? '#' : eventType
      this.channel
        .bindQueue(this.queueName, this.exchangeName, bindingKey)
        .then(() => {
          console.log(
            `Bound queue ${this.queueName} with binding key '${bindingKey}'`,
          )
        })
        .catch((error: Error) => console.error('Error binding queue:', error))
    }
    this.handlers.get(eventType)!.push(handler)
  }

  /**
   * Registers a handler for all event types.
   */
  subscribeToAll(handler: (event: DomainEvent) => Promise<void>): void {
    this.subscribe('*', handler)
  }

  /**
   * Unsubscribes a handler for a specific event type.
   */
  unsubscribe(
    eventType: string,
    handler: (event: DomainEvent) => Promise<void>,
  ): boolean {
    if (!this.initialized) {
      const index = this.pendingSubscriptions.findIndex(
        (sub) => sub.eventType === eventType && sub.handler === handler,
      )
      if (index !== -1) {
        this.pendingSubscriptions.splice(index, 1)
        return true
      }
      return false
    }

    const handlers = this.handlers.get(eventType)
    if (!handlers) return false

    const index = handlers.indexOf(handler)
    if (index === -1) return false
    handlers.splice(index, 1)

    if (handlers.length === 0) {
      const bindingKey = eventType === '*' ? '#' : eventType
      this.channel
        .unbindQueue(this.queueName, this.exchangeName, bindingKey)
        .catch((error: Error) => console.error('Error unbinding queue:', error))
    }
    return true
  }

  /**
   * Subscribes a handler for all event types.
   */
  async bindEventTypes(eventTypes: string[]): Promise<void> {
    if (!this.initialized) {
      await this.init()
    }

    for (const eventType of eventTypes) {
      await this.channel.bindQueue(this.queueName, this.exchangeName, eventType)

      console.log(
        `Bound queue ${this.queueName} to exchange ${this.exchangeName} with key '${eventType}'`,
      )
    }
  }

  /**
   * Closes the RabbitMQ channel and connection gracefully.
   */
  async shutdown(): Promise<void> {
    if (!this.initialized) {
      return
    }

    // Set shuttingDown flag to prevent reconnection attempts during shutdown
    this.shuttingDown = true
    console.info('Shutting down RabbitMQ connections...')

    try {
      if (this.channel) {
        await this.channel.close()
        console.info('RabbitMQ channel closed successfully')
      }
    } catch (error) {
      console.error('Error closing channel:', error)
    }

    try {
      if (this.connection) {
        await this.connection.close()
        console.info('RabbitMQ connection closed successfully')
      }
    } catch (error) {
      console.error('Error closing connection:', error)
    }

    this.initialized = false
    console.info('RabbitMQ shutdown complete')
  }

  /**
   * Checks the health of the RabbitMQ connection and channel.
   * Returns 'UP' if healthy, 'DOWN' otherwise.
   */
  async checkHealth(): Promise<{ status: string; details: any }> {
    try {
      if (!this.initialized || !this.connection || !this.channel) {
        return {
          status: 'DOWN',
          details: { reason: 'Not initialized or connection lost' },
        }
      }

      // Check if connection is still open
      if (!this.connection.createChannel) {
        return {
          status: 'DOWN',
          details: { reason: 'Connection is closed' },
        }
      }

      // Get queue info as health indicator
      const queueInfo = await this.channel.checkQueue(this.queueName)

      return {
        status: 'UP',
        details: {
          messageCount: queueInfo.messageCount,
          consumerCount: queueInfo.consumerCount,
        },
      }
    } catch (error) {
      return {
        status: 'DOWN',
        details: { error: error.message },
      }
    }
  }
}

/**
 * Retrieves the RabbitMQ URL from environment variables or uses a default value.
 */
export function getRabbitMQUrl(): string {
  const rabbitMQUsername = process.env.RABBIT_MQ_USERNAME || 'library'
  const rabbitMQPassword = process.env.RABBIT_MQ_PASSWORD || 'library'
  const rabbitMQHost = process.env.RABBIT_MQ_URL || 'localhost'
  const rabbitMQPort = process.env.RABBIT_MQ_PORT || '5672'

  return `amqp://${rabbitMQUsername}:${rabbitMQPassword}@${rabbitMQHost}:${rabbitMQPort}`
}
