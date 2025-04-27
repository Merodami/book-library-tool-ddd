import { afterAll, beforeAll } from 'vitest'

/**
 * Sets up silent logging for tests and restores original environment after tests complete.
 * This function should be called at the top level of test files or in a setup file.
 */
export function setupSilentLogging(): void {
  // Store original environment variables
  let originalNodeEnv: string | undefined
  let originalLogLevel: string | undefined

  // Set environment variables for tests
  beforeAll(() => {
    // Store original values
    originalNodeEnv = process.env.NODE_ENV
    originalLogLevel = process.env.LOG_LEVEL

    // Set test values
    process.env.NODE_ENV = 'test'
    process.env.LOG_LEVEL = 'silent' // Most loggers recognize 'silent' as suppressing all output
  })

  // Restore original environment variables after tests
  afterAll(() => {
    // Restore original values
    process.env.NODE_ENV = originalNodeEnv
    process.env.LOG_LEVEL = originalLogLevel
  })
}
