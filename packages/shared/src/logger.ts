import { pino } from 'pino'

// Define a Context type for optional request data.
export type Context = {
  requestId?: string
  originalRequestId?: string
}

// A getter for context – can be set at runtime.
let getContext = (): Context => ({})

// Determine environment.
const isDevelopment = process.env.NODE_ENV === 'development'

// Configure pino options.
// In development, use pino-pretty for colorized, human-friendly logs.
const pinoOptions: pino.LoggerOptions = {
  level: process.env.LOG_LEVEL || 'info',
  ...(isDevelopment && {
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'HH:MM:ss.l', // time format
        ignore: 'pid,hostname', // simplify output
      },
    },
  }),
}

// Create the base pino logger.
const baseLogger = pino(pinoOptions)

/**
 * Creates a logger instance that automatically includes the provided base data
 * and merges in dynamic context from getContext() on every log call.
 */
const createLogger = (baseData: Record<string, unknown> = {}) => {
  return {
    debug: (...args: unknown[]): void => log('debug', baseData, ...args),
    info: (...args: unknown[]): void => log('info', baseData, ...args),
    warn: (...args: unknown[]): void => log('warn', baseData, ...args),
    error: (...args: unknown[]): void => log('error', baseData, ...args),
  }
}

/**
 * Internal log function that merges base data, dynamic context,
 * and any extra data provided to the log call.
 */
function log(
  level: 'debug' | 'info' | 'warn' | 'error',
  baseData: Record<string, unknown>,
  ...args: unknown[]
): void {
  const context = getContext()
  const data: Record<string, unknown> = { ...baseData, ...context }
  const messageParts: string[] = []

  for (const arg of args) {
    if (typeof arg === 'string') {
      messageParts.push(arg)
    } else if (arg instanceof Error) {
      // Attach error details.
      data.error = { message: arg.message, stack: arg.stack }
    } else if (Array.isArray(arg)) {
      data.array = arg
    } else if (typeof arg === 'object' && arg !== null) {
      // Merge objects into the log's data payload.
      Object.assign(data, arg)
    } else {
      messageParts.push(String(arg))
    }
  }

  const message = messageParts.join(' ')
  baseLogger[level](data, message)
}

// Create and export a default logger instance.
const logger = createLogger()
export default logger

/**
 * Allow external code to update the context getter.
 */
export const setContextGetter = (ctxGetter: () => Context): void => {
  getContext = ctxGetter
}
