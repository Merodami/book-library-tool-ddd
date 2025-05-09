import {
  WALLET_PAYMENT_DECLINED,
  WALLET_PAYMENT_SUCCESS,
} from '@book-library-tool/event-store'
import { type EventBusPort } from '@book-library-tool/event-store'
import type { DomainEvent } from '@book-library-tool/shared'
import { ErrorCode, Errors, logger } from '@book-library-tool/shared'
import { ProcessWalletPaymentCommand } from '@wallets/application/use_cases/commands/ProcessWalletPaymentCommand.js'
import {
  WalletReadProjectionRepositoryPort,
  WalletReadRepositoryPort,
  WalletWriteRepositoryPort,
} from '@wallets/domain/port/index.js'

const RESERVATION_FEE = parseInt(process.env.BOOK_RESERVATION_FEE ?? '3', 10)

/**
 * Command handler for processing wallet payments.
 * This class handles the payment processing workflow for book reservations,
 * ensuring proper balance checks and maintaining consistency between
 * the event store and projection.
 */
export class ProcessWalletPaymentHandler {
  constructor(
    private readonly walletWriteRepository: WalletWriteRepositoryPort,
    private readonly walletReadRepository: WalletReadRepositoryPort,
    private readonly walletReadProjectionRepository: WalletReadProjectionRepositoryPort,
    private readonly eventBus: EventBusPort,
  ) {}

  /**
   * Processes a payment for a reservation from a user's wallet.
   * This method implements the payment processing workflow:
   * 1. Checks wallet existence and balance in the projection
   * 2. Verifies wallet consistency with the event store
   * 3. Processes the payment if funds are available
   * 4. Publishes appropriate success/declined events
   *
   * @param command - The payment processing command
   * @param command.userId - The ID of the user making the payment
   * @param command.reservationId - The ID of the reservation being paid for
   * @param command.amount - Optional payment amount (defaults to reservation fee)
   * @returns Promise resolving to true if payment succeeds, false if declined
   * @throws {ApplicationError} If payment processing fails (500)
   */
  async execute(command: ProcessWalletPaymentCommand): Promise<boolean> {
    const { id, userId, reservationId, amount = RESERVATION_FEE } = command

    try {
      logger.info(
        `Processing payment of ${amount} for reservation ${reservationId}`,
      )

      // Use projection repository to check if wallet exists and has sufficient funds
      const walletProjection =
        await this.walletReadProjectionRepository.getWallet({
          userId,
        })

      if (!walletProjection) {
        logger.warn(`Payment declined: No wallet found for wallet ${id}`)

        await this.publishDeclinedEvent(
          id,
          userId,
          reservationId,
          `No wallet found for wallet ${id}`,
        )

        return false
      }

      // Check if wallet has sufficient balance
      if (walletProjection.balance && walletProjection.balance < amount) {
        const reason = `Insufficient funds: required ${amount}, available ${walletProjection.balance}`

        logger.warn(`Payment declined: ${reason}`)

        await this.publishDeclinedEvent(id, userId, reservationId, reason)

        return false
      }

      // Get the wallet from the write model to process the payment
      const wallet = await this.walletReadRepository.findById(id)

      if (!wallet) {
        logger.error(
          `Wallet aggregate not found for id ${id} despite existing in projection`,
        )

        await this.publishDeclinedEvent(
          id,
          userId,
          reservationId,
          'Wallet data inconsistency',
        )

        return false
      }

      // Process the payment
      const updateResult = wallet.updateBalance(-amount)

      // Save the event
      await this.walletWriteRepository.saveEvents(
        wallet.id,
        [updateResult.event],
        wallet.version,
      )

      // Publish the domain event
      await this.eventBus.publish(updateResult.event)

      // Publish the integration success event
      await this.publishSuccessEvent(id, command.userId, reservationId, amount)

      logger.info(
        `Successfully processed payment for reservation ${reservationId}`,
      )

      return true
    } catch (error) {
      logger.error(`Payment processing failed: ${error.message}`)

      if (command.reservationId) {
        await this.publishDeclinedEvent(
          id,
          userId,
          reservationId,
          `Payment processing error: ${error.message}`,
        )
      }

      throw new Errors.ApplicationError(
        500,
        ErrorCode.PAYMENT_PROCESSING_ERROR,
        `Failed to process payment: ${error.message}`,
      )
    }
  }

  /**
   * Publishes a payment success event to notify other services.
   * This event is used to update the reservation status and trigger
   * any necessary follow-up actions.
   *
   * @param userId - The ID of the user who made the payment
   * @param reservationId - The ID of the reservation being paid for
   * @param amount - The amount that was paid
   */
  private async publishSuccessEvent(
    id: string,
    userId: string,
    reservationId: string,
    amount: number,
  ): Promise<void> {
    const successEvent: DomainEvent = {
      eventType: WALLET_PAYMENT_SUCCESS,
      aggregateId: reservationId,
      payload: {
        id,
        userId,
        reservationId,
        amount,
        processedAt: new Date().toISOString(),
      },
      timestamp: new Date(),
      version: 1,
      schemaVersion: 1,
    }

    await this.eventBus.publish(successEvent)
  }

  /**
   * Publishes a payment declined event to notify other services.
   * This event is used to update the reservation status and trigger
   * any necessary follow-up actions.
   *
   * @param userId - The ID of the user whose payment was declined
   * @param reservationId - The ID of the reservation that failed payment
   * @param reason - The reason why the payment was declined
   */
  private async publishDeclinedEvent(
    id: string,
    userId: string,
    reservationId: string,
    reason: string,
  ): Promise<void> {
    const declinedEvent: DomainEvent = {
      eventType: WALLET_PAYMENT_DECLINED,
      aggregateId: reservationId,
      payload: {
        id,
        userId,
        reservationId,
        reason,
        processedAt: new Date().toISOString(),
      },
      timestamp: new Date(),
      version: 1,
      schemaVersion: 1,
    }

    await this.eventBus.publish(declinedEvent)
  }
}
