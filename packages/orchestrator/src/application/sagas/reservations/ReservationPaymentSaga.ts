// src/application/sagas/reservation-payment/ReservationPaymentSaga.ts
// Import your event constants
import {
  RESERVATION_CONFIRMED,
  RESERVATION_PENDING_PAYMENT,
  WALLET_PAYMENT_DECLINED,
  WALLET_PAYMENT_SUCCESS,
} from '@book-library-tool/constants'
import { DomainEvent } from '@book-library-tool/event-store'
import { logger } from '@book-library-tool/shared'
import { v4 as uuidv4 } from 'uuid'

import { SagaRepository } from '../../../domain/SagaRepository'
import { EventBus } from '../../../infrastructure/event-bus/EventBus'
import { ConfirmReservationCommand } from '../../commands/ConfirmReservationCommand'
import {
  ReservationPaymentSagaState,
  ReservationPaymentSagaStatus,
} from './ReservationPaymentSagaState'

export class ReservationPaymentSaga {
  constructor(
    private readonly sagaRepository: SagaRepository<ReservationPaymentSagaState>,
    private readonly eventBus: EventBus,
  ) {}

  /**
   * Initialize the saga by subscribing to relevant events
   */
  initialize(): void {
    // Subscribe to events that trigger or advance this saga
    this.eventBus.subscribe(
      RESERVATION_PENDING_PAYMENT,
      this.handleReservationPendingPayment.bind(this),
    )
    this.eventBus.subscribe(
      WALLET_PAYMENT_SUCCESS,
      this.handleWalletPaymentSuccess.bind(this),
    )
    this.eventBus.subscribe(
      WALLET_PAYMENT_DECLINED,
      this.handleWalletPaymentDeclined.bind(this),
    )
    this.eventBus.subscribe(
      RESERVATION_CONFIRMED,
      this.handleReservationConfirmed.bind(this),
    )

    logger.info('ReservationPaymentSaga initialized and subscribed to events')
  }

  /**
   * Handle the event when a reservation is pending payment
   */
  async handleReservationPendingPayment(event: DomainEvent): Promise<void> {
    const reservationId = event.aggregateId
    const userId = event.payload.userId
    const amount = event.payload.amount

    logger.info(`Starting payment saga for reservation ${reservationId}`)

    // Create a new saga state
    const sagaState: ReservationPaymentSagaState = {
      id: uuidv4(),
      reservationId,
      userId,
      amount,
      status: ReservationPaymentSagaStatus.STARTED,
      startedAt: new Date(),
      updatedAt: new Date(),
    }

    // Persist the saga state
    await this.sagaRepository.save(sagaState)

    logger.info(`Payment saga initiated for reservation ${reservationId}`)

    // Note: We don't need to send any commands here as the wallet service
    // should already be subscribed to RESERVATION_PENDING_PAYMENT and will
    // attempt to process the payment
  }

  /**
   * Handle the event when a payment is successful
   */
  async handleWalletPaymentSuccess(event: DomainEvent): Promise<void> {
    const reservationId = event.payload.reservationId

    logger.info(
      `Processing successful payment for reservation ${reservationId}`,
    )

    // Find the saga instance
    const sagaState =
      await this.sagaRepository.findByReservationId(reservationId)

    if (!sagaState) {
      logger.error(`No saga found for reservation ${reservationId}`)

      return
    }

    // Update saga state
    sagaState.status = ReservationPaymentSagaStatus.PAYMENT_PROCESSED
    sagaState.paymentReference = event.payload.paymentReference
    sagaState.paymentMethod = event.payload.paymentMethod
    sagaState.updatedAt = new Date()

    await this.sagaRepository.save(sagaState)

    // Create and send command to confirm the reservation
    const confirmCommand: ConfirmReservationCommand = {
      reservationId,
      paymentReference: event.payload.paymentReference,
      paymentMethod: event.payload.paymentMethod,
      amount: event.payload.amount,
      timestamp: new Date(),
    }

    // Send command to reservation service
    // This will be implemented in the next step
    await this.sendConfirmReservationCommand(confirmCommand)

    logger.info(`Sent confirmation command for reservation ${reservationId}`)
  }

  /**
   * Handle the event when a payment is declined
   */
  async handleWalletPaymentDeclined(event: DomainEvent): Promise<void> {
    const reservationId = event.payload.reservationId

    logger.info(`Processing declined payment for reservation ${reservationId}`)

    // Find the saga instance
    const sagaState =
      await this.sagaRepository.findByReservationId(reservationId)

    if (!sagaState) {
      logger.error(`No saga found for reservation ${reservationId}`)

      return
    }

    // Update saga state
    sagaState.status = ReservationPaymentSagaStatus.FAILED
    sagaState.error = event.payload.reason
    sagaState.updatedAt = new Date()

    await this.sagaRepository.save(sagaState)

    logger.info(
      `Payment saga marked as failed for reservation ${reservationId}: ${event.payload.reason}`,
    )

    // No additional commands needed as the projection already handles this event
  }

  /**
   * Handle the event when a reservation is confirmed
   */
  async handleReservationConfirmed(event: DomainEvent): Promise<void> {
    const reservationId = event.aggregateId

    logger.info(`Processing reservation confirmation for ${reservationId}`)

    // Find the saga instance
    const sagaState =
      await this.sagaRepository.findByReservationId(reservationId)

    if (!sagaState) {
      logger.warn(`No saga found for confirmed reservation ${reservationId}`)

      return
    }

    // Update saga state
    sagaState.status = ReservationPaymentSagaStatus.COMPLETED
    sagaState.completedAt = new Date()
    sagaState.updatedAt = new Date()

    await this.sagaRepository.save(sagaState)

    logger.info(`Payment saga completed for reservation ${reservationId}`)
  }

  /**
   * Send command to confirm reservation
   * This would typically use a command bus or REST API
   */
  private async sendConfirmReservationCommand(
    command: ConfirmReservationCommand,
  ): Promise<void> {
    // Implementation depends on how services communicate
    // For example, using HTTP:
    try {
      // Example using axios or fetch to send command to reservation service
      // await axios.post('http://reservation-service/api/reservations/confirm', command);

      // For now, we'll just emit an event as a placeholder
      // In a real implementation, you would call the reservation service API

      logger.info(
        `Command sent to confirm reservation ${command.reservationId}`,
      )
    } catch (error) {
      logger.error(
        `Failed to send confirm command for reservation ${command.reservationId}:`,
        error,
      )
      throw error
    }
  }
}
