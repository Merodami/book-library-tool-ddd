import logger from '../../../shared/src/logger.js'
import type { ApiRequestOptions } from '../openapi/core/ApiRequestOptions.js'
import { CancelablePromise } from '../openapi/core/CancelablePromise.js'
import type { OpenAPIConfig } from '../openapi/core/OpenAPI.js'
import { API } from '../openapi/index.js'
import { ApiError } from '../openapi/index.js'

/**
 * RetryHttpRequest configuration options
 */
export interface RetryConfig {
  /** Maximum number of retry attempts */
  maxRetries?: number
  /** Timeout in milliseconds for each request */
  timeout?: number
  /** Base delay in milliseconds between retries (will be multiplied by attempt number) */
  baseDelay?: number
  /** Maximum delay in milliseconds between retries */
  maxDelay?: number
  /** Whether to use exponential backoff (true) or linear backoff (false) */
  useExponentialBackoff?: boolean
  /** Status codes that should trigger a retry */
  retryableStatusCodes?: number[]
  /** Whether to retry on network errors */
  retryOnNetworkError?: boolean
  /** Logger function for retry attempts */
  logger?: (message: string, error?: unknown) => void
}

/**
 * Default retry configuration
 */
const DEFAULT_RETRY_CONFIG: Required<RetryConfig> = {
  maxRetries: 3,
  timeout: 30000,
  baseDelay: 500,
  maxDelay: 15000,
  useExponentialBackoff: true,
  retryableStatusCodes: [408, 429, 500, 502, 503, 504],
  retryOnNetworkError: true,
  logger: logger.warn,
}

/**
 * Creates an API client with retry capability
 */
export function createRetryApiClient(
  config?: Partial<OpenAPIConfig>,
  retryConfig?: Partial<RetryConfig>,
): API {
  const fullRetryConfig = { ...DEFAULT_RETRY_CONFIG, ...retryConfig }

  // Create the original API instance
  const apiClient = new API(config)

  // Intercept all method calls to the default service to add retry capability
  const originalRequest = apiClient.request.request.bind(apiClient.request)

  // Override the request method to add retry functionality
  apiClient.request.request = function requestWithRetry<T>(
    options: ApiRequestOptions,
  ): CancelablePromise<T> {
    return new CancelablePromise<T>(
      async (
        resolve: (value: T) => void,
        reject: (reason?: any) => void,
        onCancel: (callback: () => void) => void,
      ) => {
        let lastError: Error | unknown = new Error(
          'Maximum retry attempts reached',
        )
        let delay = fullRetryConfig.baseDelay
        let timeoutId: NodeJS.Timeout

        onCancel(() => {
          if (timeoutId) clearTimeout(timeoutId)
        })

        for (
          let attempt = 0;
          attempt <= fullRetryConfig.maxRetries;
          attempt++
        ) {
          try {
            const controller = new AbortController()
            const originalOptions = { ...options, signal: controller.signal }

            timeoutId = setTimeout(
              () => controller.abort('Request timeout'),
              fullRetryConfig.timeout,
            )

            try {
              const result = await originalRequest(originalOptions)
              clearTimeout(timeoutId)
              resolve(result as T)
              return
            } finally {
              clearTimeout(timeoutId)
            }
          } catch (error) {
            lastError = error

            if (
              !shouldRetryError(error, fullRetryConfig) ||
              attempt >= fullRetryConfig.maxRetries
            ) {
              break
            }

            delay = Math.min(
              fullRetryConfig.maxDelay,
              fullRetryConfig.useExponentialBackoff
                ? fullRetryConfig.baseDelay * Math.pow(2, attempt)
                : fullRetryConfig.baseDelay * (attempt + 1),
            )

            await new Promise((r) => setTimeout(r, delay))
          }
        }

        reject(lastError)
      },
    )
  }

  return apiClient
}

/**
 * Type guard to check if an object has a numeric status property
 */
function hasNumericStatus(obj: unknown): obj is { status: number } {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'status' in obj &&
    typeof (obj as any).status === 'number'
  )
}

/**
 * Determine if an error should trigger a retry
 */
function shouldRetryError(
  error: unknown,
  config: Required<RetryConfig>,
): boolean {
  // Network errors (like TypeError for network failures)
  if (config.retryOnNetworkError && error instanceof TypeError) {
    return true
  }

  // DOMException for AbortError (timeout)
  if (
    config.retryOnNetworkError &&
    typeof DOMException !== 'undefined' &&
    error instanceof DOMException &&
    error.name === 'AbortError'
  ) {
    return true
  }

  // Check if the error is an ApiError with a status code
  if (error instanceof ApiError && hasNumericStatus(error)) {
    return config.retryableStatusCodes.includes(error.status)
  }

  // Check for any object with a status code
  if (hasNumericStatus(error)) {
    return config.retryableStatusCodes.includes(error.status)
  }

  return false
}
