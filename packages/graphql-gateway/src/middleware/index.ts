import { ApolloServerPluginCacheControl } from '@apollo/server/plugin/cacheControl'
import { Express } from 'express'

import { ApolloServerPluginErrorHandler } from './error-handler.js'
import { ApolloServerPluginLogging } from './logging.js'
import { createQueryComplexityPlugin } from './query-complexity.js'

export const plugins = [
  ApolloServerPluginErrorHandler,
  ApolloServerPluginLogging,
  createQueryComplexityPlugin(),
  ApolloServerPluginCacheControl({
    defaultMaxAge: 60, // Cache for 1 minute
  }),
]

export const setupMiddleware = (app: Express): void => {
  // TODO: Add middleware setup if needed
  // Currently, the middleware is handled through Apollo Server plugins
}
