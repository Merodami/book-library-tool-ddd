import amqplib from 'amqplib'

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

  constructor(private rabbitMQUrl: string = getRabbitMQUrl()) {}

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
      this.channel = await this.connection.createChannel()

      // Declare exchange
      await this.channel.assertExchange(this.exchangeName, 'topic', {
        durable: true,
      })

      // Declare queue
      const queueName = process.env.EVENTS_QUEUE || 'books_service_queue'

      const { queue } = await this.channel.assertQueue(queueName, {
        durable: true,
        exclusive: false,
        autoDelete: false,
      })

      this.queueName = queue

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

    // Start consuming messages
    await this.channel.consume(this.queueName, this.handleMessage.bind(this), {
      noAck: false,
    })

    console.log(`Started consuming messages from queue: ${this.queueName}`)
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
    this.channel.publish(this.exchangeName, routingKey, messageBuffer, {
      persistent: true, // Ensure the message is stored on disk.
    })
    console.log(`Published event [${routingKey}]: ${messageBuffer.toString()}`)
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
   * Closes the RabbitMQ channel and connection gracefully.
   */
  async shutdown(): Promise<void> {
    if (!this.initialized) {
      return
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
 */
export function getRabbitMQUrl(): string {
  const rabbitMQUsername = process.env.RABBIT_MQ_USERNAME || 'library'
  const rabbitMQPassword = process.env.RABBIT_MQ_PASSWORD || 'library'
  const rabbitMQHost = process.env.RABBIT_MQ_URL || 'localhost'
  const rabbitMQPort = process.env.RABBIT_MQ_PORT || '5672'

  return `amqp://${rabbitMQUsername}:${rabbitMQPassword}@${rabbitMQHost}:${rabbitMQPort}`
}
