import { WalletDTO } from '@book-library-tool/api'
import {
  AggregateRoot,
  DomainEvent,
  WALLET_BALANCE_UPDATED,
  WALLET_CREATED,
  WALLET_LATE_FEE_APPLIED,
} from '@book-library-tool/event-store'
import { Money } from '@wallets/value_objects/Money.js'

export interface WalletProps {
  userId: string
  balance: Money
}

/**
 * Wallet aggregate root that handles wallet balance operations
 * and generates domain events for state changes.
 *
 * This class implements the aggregate root pattern and event sourcing,
 * ensuring that all wallet state changes are captured as domain events.
 * It maintains invariants and business rules related to:
 * - Wallet creation and initialization
 * - Balance updates and transactions
 * - Late fee calculations and book purchase conditions
 *
 * The wallet aggregate is responsible for:
 * - Maintaining consistency of wallet state
 * - Generating domain events for all state changes
 * - Enforcing business rules around balance operations
 * - Supporting event sourcing through rehydration
 */
export class Wallet extends AggregateRoot {
  public readonly userId: string
  public balance: Money
  public createdAt: Date
  public updatedAt: Date

  private constructor(
    id: string | undefined,
    props: WalletProps,
    createdAt: Date,
    updatedAt: Date,
  ) {
    super(id)
    this.userId = props.userId
    this.balance = props.balance
    this.createdAt = createdAt
    this.updatedAt = updatedAt
  }

  /**
   * Factory method to create a new wallet.
   * This method initializes a new wallet with the specified user ID and
   * optional initial balance. It generates a WALLET_CREATED domain event
   * to record the wallet's creation.
   *
   * @param props - Configuration for wallet creation
   * @param props.userId - The ID of the user who owns the wallet
   * @param props.initialBalance - Optional initial balance (defaults to 0)
   * @param props.existingWalletId - Optional ID for existing wallet recreation
   * @returns An object containing the new wallet and its creation event
   */
  public static create(props: {
    userId: string
    initialBalance?: number
    existingWalletId?: string
  }): {
    wallet: Wallet
    event: DomainEvent
  } {
    const now = new Date()
    const initialBalance = Money.fromFloat(props.initialBalance || 0)

    const wallet = new Wallet(
      undefined,
      { userId: props.userId, balance: initialBalance },
      now,
      now,
    )

    const event: DomainEvent = {
      aggregateId: props.existingWalletId ? props.existingWalletId : wallet.id,
      eventType: WALLET_CREATED,
      payload: {
        userId: props.userId,
        balance: initialBalance.toFloat(),
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      },
      timestamp: now,
      version: 1,
      schemaVersion: 1,
    }

    wallet.addDomainEvent(event)

    return { wallet, event }
  }

  /**
   * Updates the wallet balance by adding or subtracting the specified amount.
   * This method enforces business rules around balance updates and generates
   * a WALLET_BALANCE_UPDATED domain event to record the change.
   *
   * @param amount - The amount to add (positive) or subtract (negative)
   * @returns An object containing the updated wallet and the balance update event
   */
  public updateBalance(amount: number): { wallet: Wallet; event: DomainEvent } {
    const now = new Date()
    const amountMoney = Money.fromFloat(amount)
    const newBalance =
      amount >= 0
        ? this.balance.add(amountMoney)
        : this.balance.subtract(Money.fromFloat(Math.abs(amount)))

    const newVersion = this.version + 1

    const updatedWallet = new Wallet(
      this.id,
      { userId: this.userId, balance: newBalance },
      this.createdAt,
      now,
    )

    const event: DomainEvent = {
      aggregateId: this.id,
      eventType: WALLET_BALANCE_UPDATED,
      payload: {
        userId: this.userId,
        previousBalance: this.balance.toFloat(),
        amount: amount,
        newBalance: newBalance.toFloat(),
        updatedAt: now.toISOString(),
      },
      timestamp: now,
      version: newVersion,
      schemaVersion: 1,
    }

    updatedWallet.addDomainEvent(event)

    return { wallet: updatedWallet, event }
  }

  /**
   * Applies a late fee to the wallet based on the number of days a book is late.
   * This method implements the business rule that if the late fee exceeds the
   * book's retail price, the book is considered purchased.
   *
   * @param reservationId - The ID of the reservation being processed
   * @param daysLate - The number of days the book is late
   * @param retailPrice - The retail price of the book
   * @param feePerDay - The daily late fee rate
   * @returns An object containing:
   *   - The updated wallet
   *   - The late fee application event
   *   - A boolean indicating if the book was purchased
   */
  public applyLateFee(
    reservationId: string,
    daysLate: number,
    retailPrice: number,
    feePerDay: number,
  ): { wallet: Wallet; event: DomainEvent; bookPurchased: boolean } {
    const feePerDayMoney = Money.fromFloat(feePerDay)
    const feeMoney = feePerDayMoney.multiply(daysLate)
    const retailPriceMoney = Money.fromFloat(retailPrice)

    const bookPurchased = feeMoney.isGreaterThanOrEqual(retailPriceMoney)
    const now = new Date()
    const newBalance = this.balance.subtract(feeMoney)
    const newVersion = this.version + 1

    const updatedWallet = new Wallet(
      this.id,
      { userId: this.userId, balance: newBalance },
      this.createdAt,
      now,
    )

    const event: DomainEvent = {
      aggregateId: this.id,
      eventType: WALLET_LATE_FEE_APPLIED,
      payload: {
        userId: this.userId,
        reservationId: reservationId,
        previousBalance: this.balance.toFloat(),
        fee: feeMoney.toFloat(),
        newBalance: newBalance.toFloat(),
        daysLate: daysLate,
        retailPrice: retailPrice,
        feePerDay: feePerDay,
        bookPurchased: bookPurchased,
        updatedAt: now.toISOString(),
      },
      timestamp: now,
      version: newVersion,
      schemaVersion: 1,
    }

    updatedWallet.addDomainEvent(event)

    return { wallet: updatedWallet, event, bookPurchased }
  }

  /**
   * Rehydrates a Wallet aggregate from an array of DomainEvents.
   * This method implements event sourcing by replaying events in order
   * to reconstruct the wallet's current state.
   *
   * @param events - Array of domain events in chronological order
   * @returns A fully reconstructed Wallet instance
   * @throws Error if no events are provided or if the first event is not WALLET_CREATED
   */
  public static rehydrate(events: DomainEvent[]): Wallet {
    if (!events || events.length === 0) {
      throw new Error('No events provided to rehydrate the Wallet aggregate')
    }

    events.sort((a, b) => a.version - b.version)

    let wallet: Wallet | undefined

    for (const event of events) {
      wallet =
        wallet ??
        (() => {
          if (event.eventType === WALLET_CREATED) {
            const temp = new Wallet(
              event.aggregateId,
              {
                userId: event.payload.userId,
                balance: Money.fromFloat(event.payload.balance),
              },
              new Date(event.timestamp),
              new Date(event.timestamp),
            )

            temp.version = event.version

            return temp
          }
          throw new Error('First event must be a WalletCreated event')
        })()

      wallet.applyEvent(event)
      wallet.version = event.version
    }

    if (!wallet) {
      throw new Error('Failed to rehydrate the Wallet aggregate')
    }

    return wallet
  }

  /**
   * Applies events to update the wallet state.
   * This protected method is used internally during rehydration
   * to update the wallet's state based on domain events.
   *
   * @param event - The domain event to apply
   */
  protected applyEvent(event: DomainEvent): void {
    switch (event.eventType) {
      case WALLET_CREATED:
        this.createdAt = new Date(event.timestamp)
        this.updatedAt = new Date(event.timestamp)
        break
      case WALLET_BALANCE_UPDATED:
        this.balance = Money.fromFloat(event.payload.newBalance)
        this.updatedAt = new Date(event.timestamp)
        break
      case WALLET_LATE_FEE_APPLIED:
        this.balance = Money.fromFloat(event.payload.newBalance)
        this.updatedAt = new Date(event.timestamp)
        break
      default:
        // Ignore unknown events
        break
    }
  }

  /**
   * Creates a Wallet instance from persistence data (projection).
   * This method is used to reconstruct a wallet from the read model
   * when full event replay is not necessary.
   *
   * @param data - The persistence data containing wallet state
   * @returns A Wallet instance with the specified state
   */
  public static fromPersistence(data: {
    id: string
    userId: string
    balance: number | Money
    version: number
    createdAt: Date
    updatedAt: Date
  }): Wallet {
    const balance =
      typeof data.balance === 'number'
        ? Money.fromFloat(data.balance)
        : data.balance

    const wallet = new Wallet(
      data.id,
      { userId: data.userId, balance: balance },
      data.createdAt,
      data.updatedAt,
    )

    wallet.version = data.version

    return wallet
  }

  /**
   * Converts the Wallet entity to a data transfer object suitable for API responses.
   * This method formats the wallet's data for external consumption,
   * including proper date formatting and balance precision.
   *
   * @returns A DTO representation of the wallet with balance formatted to one decimal place
   */
  public toDTO(): WalletDTO {
    return {
      id: this.id,
      userId: this.userId,
      balance: this.balance.toFloat(),
      createdAt: this.createdAt.toISOString(),
      updatedAt: this.updatedAt.toISOString(),
    }
  }
}
