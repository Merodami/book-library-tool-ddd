// workflow-orchestrator/src/domain/model/PaymentSaga.ts
import { v4 as uuidv4 } from 'uuid'

export enum PaymentSagaState {
  INITIATED = 'INITIATED',
  PAYMENT_PROCESSED = 'PAYMENT_PROCESSED',
  RESERVATION_CONFIRMED = 'RESERVATION_CONFIRMED',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

export class PaymentSaga {
  private id: string
  private reservationId: string
  private userId: string
  private amount: number
  private state: PaymentSagaState
  private paymentReference?: string
  private paymentMethod?: string
  private errorMessage?: string
  private startedAt: Date
  private updatedAt: Date
  private completedAt?: Date

  constructor(reservationId: string, userId: string, amount: number) {
    this.id = uuidv4()
    this.reservationId = reservationId
    this.userId = userId
    this.amount = amount
    this.state = PaymentSagaState.INITIATED
    this.startedAt = new Date()
    this.updatedAt = new Date()
  }

  public getId(): string {
    return this.id
  }

  public getReservationId(): string {
    return this.reservationId
  }

  public getState(): PaymentSagaState {
    return this.state
  }

  public markPaymentProcessed(
    paymentReference: string,
    paymentMethod: string,
  ): void {
    this.paymentReference = paymentReference
    this.paymentMethod = paymentMethod
    this.state = PaymentSagaState.PAYMENT_PROCESSED
    this.updatedAt = new Date()
  }

  public markReservationConfirmed(): void {
    this.state = PaymentSagaState.RESERVATION_CONFIRMED
    this.updatedAt = new Date()
  }

  public complete(): void {
    this.state = PaymentSagaState.COMPLETED
    this.completedAt = new Date()
    this.updatedAt = new Date()
  }

  public fail(errorMessage: string): void {
    this.state = PaymentSagaState.FAILED
    this.errorMessage = errorMessage
    this.updatedAt = new Date()
  }

  // Additional getters and methods as needed
}
