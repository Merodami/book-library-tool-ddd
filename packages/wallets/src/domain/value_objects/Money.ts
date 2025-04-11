import Dinero from 'dinero.js'

/**
 * Money value object for representing currency values with 1 decimal place.
 * Uses Dinero.js v1.9.1 for precise currency handling.
 */
export class Money {
  private value: Dinero.Dinero

  private constructor(amount: number) {
    // Configure Dinero.js to use 1 decimal place
    Dinero.defaultPrecision = 1

    // Store as integer amount (tenths of a unit)
    this.value = Dinero({
      amount: Math.round(amount * 10),
      precision: 1,
      currency: 'USD',
    })
  }

  /**
   * Creates a Money object from a floating point number
   */
  static fromFloat(amount: number): Money {
    return new Money(amount)
  }

  /**
   * Adds another Money value and returns a new Money object
   */
  add(other: Money): Money {
    const result = new Money(0)
    result.value = this.value.add(other.value)
    return result
  }

  /**
   * Subtracts another Money value and returns a new Money object
   */
  subtract(other: Money): Money {
    const result = new Money(0)
    result.value = this.value.subtract(other.value)
    return result
  }

  /**
   * Multiplies the money amount by a factor and returns a new Money object
   */
  multiply(factor: number): Money {
    const result = new Money(0)
    result.value = this.value.multiply(factor)
    return result
  }

  /**
   * Checks if this money amount is greater than or equal to another
   */
  isGreaterThanOrEqual(other: Money): boolean {
    return this.value.greaterThanOrEqual(other.value)
  }

  /**
   * Converts the money to a floating point number
   */
  toFloat(): number {
    return this.value.toUnit()
  }

  /**
   * Returns a string representation of the money value
   */
  toString(): string {
    return this.value.toFormat('0.0')
  }

  /**
   * Returns a formatted currency string (e.g., "$10.5")
   */
  format(locale: string = 'en-US'): string {
    // Set locale but use the currency already defined
    return this.value.setLocale(locale).toFormat()
  }
}
