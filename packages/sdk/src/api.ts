import { API } from './openapi/index.js'
import { MaybeAPIError } from './types.js'

export const apiBooks = new API({
  BASE: process.env.BOOKS_API_URL || 'localhost:3001',
  TOKEN: process.env.INTERNAL_API_TOKEN,
})

export const apiWallet = new API({
  BASE: process.env.WALLETS_API_URL || 'localhost:3002',
  TOKEN: process.env.INTERNAL_API_TOKEN,
})

/**
 * Access the error text from an API error.
 */
export function getErrorMessage(error: unknown) {
  if (!error) {
    return null
  }

  const castError = error as MaybeAPIError

  return castError.body?.message ?? castError.message
}

export { ApiError } from './openapi/index.js'
