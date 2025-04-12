/**
 * Command for updating a user's wallet balance.
 */
export interface UpdateWalletBalanceCommand {
  /** The ID of the user whose wallet is being updated */
  userId: string
  /** The amount to add to the wallet balance (can be negative for deductions) */
  amount: number
  /** Optional reason for the balance update */
  reason?: string
}
