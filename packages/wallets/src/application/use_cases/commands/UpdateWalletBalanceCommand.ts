/**
 * Command for updating a user's wallet balance.
 */
export interface UpdateWalletBalanceCommand {
  /** The ID of the wallet to update */
  id: string
  /** The amount to add to the wallet balance (can be negative for deductions) */
  amount: number
  /** Optional reason for the balance update */
  reason?: string
}
