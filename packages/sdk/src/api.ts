import { API } from './openapi/index.js'

/**
 * A type representing potential API errors.
 *
 * Extends the standard Error object to include an optional `body` property which may contain
 * additional information such as a message and error data. The `data` object can further provide
 * details like an error code, status code, and message.
 *
 * @typedef {Error & { body?: {
 *   message: string,
 *   data?: {
 *     code?: string,
 *     statusCode?: string,
 *     message?: string
 *   }
 * }}} MaybeAPIError
 */
export type MaybeAPIError = Error & {
  body?: {
    message: string
    data?: {
      code?: string
      statusCode?: string
      message?: string
    }
  }
}

/**
 * API client instance configured for interacting with the Books API.
 *
 * The base URL is taken from the `BOOKS_API_URL` environment variable, defaulting to
 * 'localhost:3001' if not provided. An internal API token (if available) is also configured.
 *
 * @constant {API}
 */
export const apiBooks = new API({
  BASE: process.env.BOOKS_API_URL || 'localhost:3001',
  TOKEN: process.env.INTERNAL_API_TOKEN,
})

/**
 * API client instance configured for interacting with the Wallets API.
 *
 * The base URL is taken from the `WALLETS_API_URL` environment variable, defaulting to
 * 'localhost:3002' if not provided. It uses the same internal API token as configured.
 *
 * @constant {API}
 */
export const apiWallet = new API({
  BASE: process.env.WALLETS_API_URL || 'localhost:3002',
  TOKEN: process.env.INTERNAL_API_TOKEN,
})

/**
 * Extracts a human-readable error message from an unknown error object.
 *
 * This function takes an error of unknown type and attempts to cast it as a `MaybeAPIError`.
 * It then returns the error message contained in the error's `body.message` if available,
 * otherwise it returns the standard error message from `error.message`.
 *
 * @param {*} error - The error object to parse.
 * @returns {string|null} The extracted error message or null if no error is provided.
 */
export function getErrorMessage(error: unknown) {
  if (!error) {
    return null
  }

  const castError = error as MaybeAPIError

  return castError.body?.message ?? castError.message
}

/**
 * Re-export the `ApiError` class from the openapi module.
 *
 * This allows consumers of this module to access the ApiError class directly.
 */
export { ApiError } from './openapi/index.js'
