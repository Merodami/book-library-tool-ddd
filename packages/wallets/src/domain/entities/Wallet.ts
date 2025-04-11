import { WalletDTO } from '@book-library-tool/api/src/schemas/wallets.js'
import {
  AggregateRoot,
  DomainEvent,
  WALLET_BALANCE_UPDATED,
  WALLET_CREATED,
  WALLET_LATE_FEE_APPLIED,
} from '@book-library-tool/event-store'
import { Money } from '@value_objects/Money.js'

export interface WalletProps {
  userId: string
  balance: Money
}

/**
 * Wallet aggregate root that handles wallet balance operations
 * and generates domain events for state changes.
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
   * Factory method to create a new wallet
   */
  public static create(props: { userId: string; initialBalance?: number }): {
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
      aggregateId: wallet.id,
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
   * Updates the wallet balance by adding or subtracting the specified amount
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
   * Applies a late fee to the wallet
   */
  public applyLateFee(
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
   * Rehydrates a Wallet aggregate from an array of DomainEvents
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
   * Applies events to update the wallet state
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
   * Creates a Wallet instance from persistence data (projection)
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
   * Converts the Wallet entity to a data transfer object suitable for API responses
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
