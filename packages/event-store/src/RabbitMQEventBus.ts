import amqplib from 'amqplib'

import type { DomainEvent } from './domain/DomainEvent.js'
import type { EventBus } from './EventBus.js'

/**
 * RabbitMQEventBus implements the EventBus interface using RabbitMQ.
 */
export class RabbitMQEventBus implements EventBus {
  private connection!: any // Use 'any' to bypass TypeScript strict typing
  private channel!: any // Use 'any' to bypass TypeScript strict typing
  private readonly exchangeName = 'events'
  private queueName!: string
  // Local registry for event handlers
  private handlers: Map<string, Array<(event: DomainEvent) => Promise<void>>> =
    new Map()
  // Pending subscriptions before initialization
  private pendingSubscriptions: Array<{
    eventType: string
    handler: (event: DomainEvent) => Promise<void>
  }> = []
  // Flag to track initialization state
  private initialized = false
  // Flag to track initialization in progress
  private initializing = false

  constructor(private rabbitMQUrl: string = getRabbitMQUrl()) {}

  /**
   * Initializes the RabbitMQ connection, channel, exchange, and queue.
   */
  async init(): Promise<void> {
    if (this.initialized) {
      return // Already initialized
    }

    if (this.initializing) {
      // Wait for initialization to complete
      while (this.initializing) {
        await new Promise((resolve) => setTimeout(resolve, 100))
      }
      return
    }

    this.initializing = true

    try {
      // Connect to RabbitMQ server
      this.connection = await amqplib.connect(this.rabbitMQUrl)
      this.channel = await this.connection.createChannel()

      // Declare a durable topic exchange named 'events'
      await this.channel.assertExchange(this.exchangeName, 'topic', {
        durable: true,
      })

      // Declare an exclusive queue (or change to a named persistent queue for production)
      const { queue } = await this.channel.assertQueue('', {
        exclusive: false,
        durable: true,
      })
      this.queueName = queue

      // Start consuming messages on the queue
      await this.channel.consume(
        this.queueName,
        this.handleMessage.bind(this),
        {
          noAck: false,
        },
      )

      // Process any pending subscriptions
      for (const { eventType, handler } of this.pendingSubscriptions) {
        this.subscribeNow(eventType, handler)
      }
      this.pendingSubscriptions = []

      this.initialized = true
      console.log(`RabbitMQEventBus initialized. Queue: ${this.queueName}`)
    } catch (error) {
      console.error('Failed to initialize RabbitMQEventBus:', error)
      throw error
    } finally {
      this.initializing = false
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

      // Retrieve both specific handlers and global handlers (registered with '*')
      const specificHandlers = this.handlers.get(routingKey) || []
      const globalHandlers = this.handlers.get('*') || []
      const allHandlers = [...specificHandlers, ...globalHandlers]

      for (const handler of allHandlers) {
        await handler(event)
      }

      // Acknowledge the message as successfully processed
      this.channel.ack(msg)
    } catch (error) {
      console.error('Error handling message:', error)
      // Negatively acknowledge the message so it can be retried or dead-lettered
      this.channel.nack(msg, false, false)
    }
  }

  /**
   * Publishes a domain event using the event's eventType as routing key.
   */
  async publish(event: DomainEvent): Promise<void> {
    // Ensure initialization
    if (!this.initialized) {
      await this.init()
    }

    const routingKey = event.eventType
    const messageBuffer = Buffer.from(JSON.stringify(event))
    this.channel.publish(this.exchangeName, routingKey, messageBuffer, {
      persistent: true,
    })
    console.log(`Published event [${routingKey}]: ${messageBuffer.toString()}`)
  }

  /**
   * Registers a handler for a specific event type.
   * If not initialized, queues the subscription to be processed after initialization.
   */
  subscribe(
    eventType: string,
    handler: (event: DomainEvent) => Promise<void>,
  ): void {
    if (!this.initialized) {
      // Queue the subscription for later
      this.pendingSubscriptions.push({ eventType, handler })

      // Try to initialize if not already in progress
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
   * Internal method to subscribe when channel is ready
   */
  private subscribeNow(
    eventType: string,
    handler: (event: DomainEvent) => Promise<void>,
  ): void {
    // First time a handler is added for an event type, bind the queue
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, [])
      // Use '#' as binding key for global subscriptions
      const bindingKey = eventType === '*' ? '#' : eventType
      this.channel
        .bindQueue(this.queueName, this.exchangeName, bindingKey)
        .then(() =>
          console.log(
            `Bound queue ${this.queueName} with binding key '${bindingKey}'`,
          ),
        )
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
      // Remove from pending subscriptions if found
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

    // Optionally, if there are no more handlers for the event type, unbind the queue
    if (handlers.length === 0) {
      const bindingKey = eventType === '*' ? '#' : eventType
      this.channel
        .unbindQueue(this.queueName, this.exchangeName, bindingKey)
        .catch((error: Error) => console.error('Error unbinding queue:', error))
    }
    return true
  }

  /**
   * Closes the RabbitMQ channel and connection gracefully.
   */
  async shutdown(): Promise<void> {
    if (!this.initialized) {
      return // Nothing to shutdown
    }

    try {
      if (this.channel) {
        await this.channel.close()
      }
    } catch (error) {
      console.error('Error closing channel:', error)
    }

    try {
      if (this.connection) {
        await this.connection.close()
      }
    } catch (error) {
      console.error('Error closing connection:', error)
    }

    this.initialized = false
  }
}

/**
 * Retrieves the RabbitMQ URL from environment variables or uses a default value.
 * @returns {string} The RabbitMQ URL.
 */
export function getRabbitMQUrl(): string {
  // Retrieve RabbitMQ URL from environment variables or use a default value
  const rabbitMQUsername = process.env.RABBIT_MQ_USERNAME || 'library'
  const rabbitMQPassword = process.env.RABBIT_MQ_PASSWORD || 'library'
  const rabbitMQHost = process.env.RABBIT_MQ_URL || 'localhost'
  const rabbitMQPort = process.env.RABBIT_MQ_PORT || '5672'

  const rabbitMQUrl = `amqp://${rabbitMQUsername}:${rabbitMQPassword}@${rabbitMQHost}:${rabbitMQPort}`

  return rabbitMQUrl
}
