import { logger } from '@book-library-tool/shared'
import type { DomainEvent, IEventBus } from '@event-store/domain/index.js'
import amqplib from 'amqplib'
import { v4 as uuidv4 } from 'uuid'

/**
 * RabbitMQEventBus implements the EventBus interface using RabbitMQ.
 * Provides reliable message publishing, consumption, error handling,
 * and support for un-routable message processing.
 */
export class RabbitMQEventBus implements IEventBus {
  private connection!: any
  private channel!: any
  private readonly exchangeName =
    process.env.RABBIT_MQ_EVENTS_EXCHANGE || 'events'
  private queueName!: string

  // Registry for event handlers
  private handlers: Map<string, Array<(event: DomainEvent) => Promise<void>>> =
    new Map()

  // Pending subscriptions before initialization
  private pendingSubscriptions: Array<{
    eventType: string
    handler: (event: DomainEvent) => Promise<void>
  }> = []

  // State flags
  private initialized = false
  private initializing = false
  private shuttingDown = false
  private reconnectAttempts = 0
  private readonly maxReconnectAttempts = 10
  private returnHandler: (msg: amqplib.Message) => void

  /**
   * Creates a new instance of RabbitMQEventBus.
   *
   * @param serviceName - Name of the service using this event bus
   * @param rabbitMQUrl - RabbitMQ connection URL (optional, defaults to environment values)
   */
  constructor(
    private serviceName: string,
    private rabbitMQUrl: string = getRabbitMQUrl(),
  ) {
    this.returnHandler = this.handleReturnedMessage.bind(this)
  }

  /**
   * Initializes the RabbitMQ connection, channel, exchanges and queues.
   * Must be called before publishing or consuming messages.
   */
  async init(): Promise<void> {
    if (this.initialized) return
    if (this.initializing) {
      while (this.initializing) {
        await new Promise((resolve) => setTimeout(resolve, 100))
      }

      return
    }

    this.initializing = true

    try {
      // Set up RabbitMQ connection and channel
      this.connection = await amqplib.connect(this.rabbitMQUrl)
      this.channel = await this.connection.createChannel()
      this.setupConnectionHandlers()
      this.channel.setMaxListeners(50)
      await this.channel.prefetch(50)
      this.channel.on('return', this.returnHandler)

      // Set up exchanges
      await this.setupExchanges()

      // Set up queues
      await this.setupQueues()

      // Process pending subscriptions
      await this.processPendingSubscriptions()

      this.initialized = true
      logger.info(
        `RabbitMQEventBus initialized. Exchange: ${this.exchangeName}, Queue: ${this.queueName}`,
      )
    } catch (error) {
      logger.error('Failed to initialize RabbitMQEventBus:', error)
      await this.cleanupAfterError()
      throw error
    } finally {
      this.initializing = false
    }
  }

  /**
   * Sets up the exchanges needed for the event bus.
   * - Main exchange: For routing messages to appropriate queues
   * - Dead letter exchange: For messages that failed processing
   * - Alternate exchange: For messages that couldn't be routed
   */
  private async setupExchanges(): Promise<void> {
    // Set up the dead letter exchange
    const deadLetterExchange = `${this.exchangeName}.deadletter`

    await this.channel.assertExchange(deadLetterExchange, 'topic', {
      durable: true,
      autoDelete: false,
    })

    // Set up the alternate exchange
    const alternateExchange = `${this.exchangeName}.alternate`

    await this.channel.assertExchange(alternateExchange, 'fanout', {
      durable: true,
      autoDelete: false,
    })

    // Declare main exchange with alternate exchange
    await this.channel.assertExchange(this.exchangeName, 'topic', {
      durable: true,
      autoDelete: false,
      arguments: {
        'alternate-exchange': alternateExchange,
      },
    })
  }

  /**
   * Sets up the queues needed for the event bus.
   * - Main queue: For consuming messages for this service
   * - Dead letter queue: For messages that failed processing
   * - Unroutable queue: For messages with no immediate destination
   */
  private async setupQueues(): Promise<void> {
    const deadLetterExchange = `${this.exchangeName}.deadletter`
    const alternateExchange = `${this.exchangeName}.alternate`
    const environment = process.env.NODE_ENV || 'development'

    // Create the main service queue
    const queueName = `${this.serviceName}.${environment}.queue`
    const { queue } = await this.channel.assertQueue(queueName, {
      durable: true,
      exclusive: false,
      autoDelete: false,
      arguments: {
        'x-dead-letter-exchange': deadLetterExchange,
        'x-message-ttl': 1000 * 60 * 60 * 24 * 7, // 7 days
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

    // Create and bind unroutable queue
    const unroutableQueueName = `${this.serviceName}.unroutable`

    await this.channel.assertQueue(unroutableQueueName, {
      durable: true,
      exclusive: false,
      autoDelete: false,
    })
    await this.channel.bindQueue(unroutableQueueName, alternateExchange, '')

    logger.info(`Created unroutable messages queue: ${unroutableQueueName}`)
  }

  /**
   * Process any subscriptions that were requested before initialization.
   */
  private async processPendingSubscriptions(): Promise<void> {
    for (const { eventType, handler } of this.pendingSubscriptions) {
      this.subscribeNow(eventType, handler)
    }

    this.pendingSubscriptions = []
  }

  /**
   * Clean up resources after a failed initialization.
   */
  private async cleanupAfterError(): Promise<void> {
    try {
      if (this.channel) {
        await this.channel.close().catch(() => {})
      }
      if (this.connection) {
        await this.connection.close().catch(() => {})
      }
    } catch (closeError) {
      logger.error(
        'Error during cleanup after failed initialization:',
        closeError,
      )
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

    // Configure consumer
    await this.channel.consume(
      this.queueName,
      async (msg: any) => {
        if (!msg) return

        const messageId = msg.properties.messageId
        const routingKey = msg.fields.routingKey

        try {
          logger.debug(`Processing message ${messageId} [${routingKey}]`)

          const startTime = Date.now()

          await this.handleMessage(msg)

          const processingTime = Date.now() - startTime

          logger.debug(`Processed message ${messageId} in ${processingTime}ms`)
        } catch (error) {
          await this.handleMessageProcessingError(
            msg,
            error,
            messageId,
            routingKey,
          )
        }
      },
      { noAck: false },
    )

    logger.info(`Started consuming messages from queue: ${this.queueName}`)

    // Start processing unroutable messages
    this.consumeUnroutableMessages()
  }

  /**
   * Handles errors that occur during message processing.
   * Implements a retry strategy with exponential backoff.
   */
  private async handleMessageProcessingError(
    msg: any,
    error: any,
    messageId: string,
    routingKey: string,
  ): Promise<void> {
    logger.error(`Error processing message ${messageId}:`, error)

    // Get message headers or create new ones
    const headers = msg.properties.headers || {}

    // Check retry count, retry up to 3 times before sending to DLQ
    const retryCount = (headers['x-retry-count'] || 0) + 1

    if (retryCount <= 3) {
      // Retry with exponential backoff
      const delay = 1000 * Math.pow(2, retryCount - 1)

      logger.info(
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
      logger.warn(`Message ${messageId} exceeded retry limit, sending to DLQ`)
      this.channel.nack(msg, false, false)
    }
  }

  /**
   * Sets up a processor to handle unroutable messages.
   * Periodically checks for messages in the unroutable queue and attempts to republish them.
   */
  private consumeUnroutableMessages(): void {
    const unroutableQueueName = `${this.serviceName}.unroutable`
    const processingInterval = 3000 // Start with 3 seconds

    let consecutiveEmpty = 0
    let processing = false

    const processUnroutable = async () => {
      // Prevent concurrent processing
      if (processing) return

      processing = true

      let processedCount = 0

      try {
        // Process up to 10 messages per batch
        for (let i = 0; i < 10; i++) {
          const msg = await this.channel.get(unroutableQueueName, {
            noAck: false,
          })

          if (!msg) {
            break
          }

          // Process the message
          try {
            const content = msg.content.toString()
            const event: DomainEvent = JSON.parse(content)
            const routingKey = event.eventType

            // Extract headers or initialize if missing
            const headers = msg.properties.headers || {}
            const retryCount = (headers['x-retry-count'] || 0) + 1

            // Update headers
            headers['x-retry-count'] = retryCount
            headers['x-last-retry'] = new Date().toISOString()

            // Attempt to republish
            this.channel.publish(this.exchangeName, routingKey, msg.content, {
              ...msg.properties,
              headers,
              mandatory: true,
            })

            this.channel.ack(msg)
            processedCount++
          } catch (error) {
            logger.error(`Error republishing message: ${error.message}`)
            this.channel.nack(msg, false, true)
          }
        }

        // Adjust the interval based on results
        this.adjustUnroutableProcessingInterval(
          processedCount,
          consecutiveEmpty,
        )

        if (processedCount > 0) {
          consecutiveEmpty = 0
        } else {
          consecutiveEmpty++
        }
      } catch (error) {
        logger.error(`Error in unroutable message processor: ${error.message}`)
      } finally {
        processing = false
      }
    }

    // Schedule recurring checks with the current interval
    const scheduleNext = () => {
      setTimeout(() => {
        processUnroutable().finally(() => {
          scheduleNext()
        })
      }, processingInterval)
    }

    // Start the processor
    scheduleNext()

    logger.info(
      `Started unroutable message processor with adaptive timing for queue: ${unroutableQueueName}`,
    )
  }

  /**
   * Adjusts the interval for processing unroutable messages based on activity.
   */
  private adjustUnroutableProcessingInterval(
    processedCount: number,
    consecutiveEmpty: number,
  ): number {
    if (processedCount > 0) {
      // Messages found and processed, speed up
      return 1000 // Check every second when active
    } else {
      // No messages, gradually slow down
      return Math.min(
        30000,
        1000 * Math.pow(1.5, Math.min(5, consecutiveEmpty)),
      )
    }
  }

  /**
   * Sets up event handlers for connection and channel events.
   */
  private setupConnectionHandlers(): void {
    this.connection.on('error', (err: any) => {
      logger.error('RabbitMQ connection error:', err)
      this.reconnect()
    })

    this.connection.on('close', () => {
      if (!this.shuttingDown) {
        logger.warn('RabbitMQ connection closed unexpectedly')
        this.reconnect()
      }
    })

    this.channel.on('error', (err: any) => {
      logger.error('RabbitMQ channel error:', err)
    })

    this.channel.on('close', () => {
      logger.warn('RabbitMQ channel closed')
    })
  }

  /**
   * Attempts to reconnect to RabbitMQ after a connection failure.
   * Uses exponential backoff for retry attempts.
   */
  async reconnect(): Promise<void> {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      logger.error('Max reconnection attempts reached, giving up')
      process.exit(1)

      return
    }

    this.reconnectAttempts++

    const delay = Math.min(30000, 1000 * Math.pow(2, this.reconnectAttempts))

    logger.info(
      `Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`,
    )

    await new Promise((resolve) => setTimeout(resolve, delay))

    try {
      this.initialized = false
      await this.init()
      this.reconnectAttempts = 0
      logger.info('Successfully reconnected to RabbitMQ')
    } catch (error) {
      logger.error('Failed to reconnect:', error)
      this.reconnect()
    }
  }

  /**
   * Handles an incoming message by parsing it and dispatching to registered handlers.
   */
  private async handleMessage(msg: any): Promise<void> {
    if (!msg) return

    try {
      const content = msg.content.toString()
      const event: DomainEvent = JSON.parse(content)
      const routingKey = msg.fields.routingKey

      // Retrieve both specific handlers and global handlers
      const specificHandlers = this.handlers.get(routingKey) || []
      const globalHandlers = this.handlers.get('*') || []
      const allHandlers = [...specificHandlers, ...globalHandlers]

      // Execute all handlers sequentially
      for (const handler of allHandlers) {
        await handler(event)
      }

      // Acknowledge message processing
      this.channel.ack(msg)
    } catch (error) {
      logger.error('Error handling message:', error)
      // Nack the message so it can be retried or sent to dead-letter
      this.channel.nack(msg, false, false)
    }
  }

  /**
   * Publishes a domain event to the message bus.
   * Uses the event's eventType as the routing key.
   *
   * @param event - The domain event to publish
   */
  async publish(event: DomainEvent): Promise<void> {
    if (!this.initialized) {
      await this.init()
    }

    const routingKey = event.eventType
    const messageBuffer = Buffer.from(JSON.stringify(event))

    // Add message properties
    const properties = {
      persistent: true,
      messageId: event.aggregateId || uuidv4(),
      timestamp: Date.now(),
      appId: this.serviceName,
      headers: {
        'x-source-service': this.serviceName,
        'x-environment': process.env.NODE_ENV || 'production',
        'x-correlation-id': event.metadata?.correlationId || 'none',
        'x-event-version': event.version || '1.0',
      },
      mandatory: true, // Return un-routable messages
    }

    const published = this.channel.publish(
      this.exchangeName,
      routingKey,
      messageBuffer,
      properties,
    )

    // Implement back pressure if channel buffer is full
    if (!published) {
      await new Promise((resolve) => this.channel.once('drain', resolve))
    }

    logger.info(`Published event [${routingKey}] ID: ${properties.messageId}`)
  }

  /**
   * Registers a handler for a specific event type.
   *
   * @param eventType - The event type to subscribe to, or '*' for all events
   * @param handler - The handler function to invoke when an event is received
   */
  subscribe(
    eventType: string,
    handler: (event: DomainEvent) => Promise<void>,
  ): void {
    if (!this.initialized) {
      this.pendingSubscriptions.push({ eventType, handler })
      if (!this.initializing) {
        this.init().catch((error) => {
          logger.error('Failed to initialize during subscribe:', error)
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
          logger.info(
            `Bound queue ${this.queueName} with binding key '${bindingKey}'`,
          )
        })
        .catch((error: Error) => logger.error('Error binding queue:', error))
    }
    this.handlers.get(eventType)!.push(handler)
  }

  /**
   * Registers a handler for all event types.
   * Shorthand for subscribe('*', handler).
   *
   * @param handler - The handler function to invoke for all events
   */
  subscribeToAll(handler: (event: DomainEvent) => Promise<void>): void {
    this.subscribe('*', handler)
  }

  /**
   * Unsubscribes a handler for a specific event type.
   *
   * @param eventType - The event type to unsubscribe from
   * @param handler - The handler function to remove
   * @returns true if the handler was removed, false otherwise
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
        .catch((error: Error) => logger.error('Error unbinding queue:', error))
    }

    return true
  }

  /**
   * Binds the queue to multiple event types at once.
   *
   * @param eventTypes - Array of event types to bind to
   */
  async bindEventTypes(eventTypes: string[]): Promise<void> {
    if (!this.initialized) {
      await this.init()
    }

    for (const eventType of eventTypes) {
      await this.channel.bindQueue(this.queueName, this.exchangeName, eventType)

      logger.info(
        `Bound queue ${this.queueName} to exchange ${this.exchangeName} with key '${eventType}'`,
      )
    }
  }

  /**
   * Handles messages returned by the RabbitMQ server due to mandatory flag
   * when no queue is bound with the appropriate routing key.
   */
  private handleReturnedMessage(msg: amqplib.Message): void {
    const routingKey = msg.fields.routingKey
    const exchange = msg.fields.exchange
    const content = msg.content.toString()

    // Log detailed information for debugging
    logger.warn({
      message: 'Message returned from server (no queue bound)',
      routingKey,
      exchange,
      serviceName: this.serviceName,
      messageId: msg.properties.messageId || 'unknown',
      contentPreview:
        content.substring(0, 200) + (content.length > 200 ? '...' : ''),
    })

    // With alternate exchange, these should be automatically routed to the unroutable queue
    // so we don't need to handle them manually here
  }

  /**
   * Manually republishes messages from the unroutable queue.
   * Useful for administrative tasks or when services come back online.
   */
  async republishUnroutableMessages(): Promise<void> {
    const unroutableQueueName = `${this.serviceName}.unroutable`

    let processed = 0

    // Process up to 100 messages at a time
    for (let i = 0; i < 100; i++) {
      const msg = await this.channel.get(unroutableQueueName, { noAck: false })

      if (!msg) {
        break // No more messages
      }

      try {
        const content = msg.content.toString()
        const event: DomainEvent = JSON.parse(content)

        // Try to republish to the main exchange
        await this.publish(event)

        // Acknowledge the message
        this.channel.ack(msg)
        processed++
      } catch (error) {
        logger.error(`Error republishing unroutable message: ${error}`)
        // Nack and requeue for later
        this.channel.nack(msg, false, true)
      }
    }

    if (processed > 0) {
      logger.info(`Republished ${processed} unroutable messages`)
    }
  }

  /**
   * Closes the RabbitMQ channel and connection gracefully.
   * Should be called when shutting down the application.
   */
  async shutdown(): Promise<void> {
    if (!this.initialized) {
      return
    }

    // Set shuttingDown flag to prevent reconnection attempts during shutdown
    this.shuttingDown = true
    logger.info('Shutting down RabbitMQ connections...')

    try {
      if (this.channel) {
        this.channel.removeListener('return', this.returnHandler)
        await this.channel.close()
        logger.info('RabbitMQ channel closed successfully')
      }
    } catch (error) {
      logger.error('Error closing channel:', error)
    }

    try {
      if (this.connection) {
        await this.connection.close()
        logger.info('RabbitMQ connection closed successfully')
      }
    } catch (error) {
      logger.error('Error closing connection:', error)
    }

    this.initialized = false
    logger.info('RabbitMQ shutdown complete')
  }

  /**
   * Checks the health of the RabbitMQ connection and channel.
   *
   * @returns An object with status ('UP' or 'DOWN') and details
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
 * Retrieves the RabbitMQ URL from environment variables or uses default values.
 */
function getRabbitMQUrl(): string {
  const rabbitMQUsername = process.env.RABBIT_MQ_USERNAME || 'library'
  const rabbitMQPassword = process.env.RABBIT_MQ_PASSWORD || 'library'
  const rabbitMQHost = process.env.RABBIT_MQ_URL || 'localhost'
  const rabbitMQPort = process.env.RABBIT_MQ_PORT || '5672'

  return `amqp://${rabbitMQUsername}:${rabbitMQPassword}@${rabbitMQHost}:${rabbitMQPort}`
}
