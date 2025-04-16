import { GraphQLRequestContext } from '@apollo/server'
import { logger } from '@book-library-tool/shared'
import { GraphQLError } from 'graphql'
import { v4 as uuidv4 } from 'uuid'

interface LogEntry {
  timestamp: string
  requestId: string
  operationName?: string
  query?: string
  variables?: Record<string, any>
  duration?: number
  errors?: readonly GraphQLError[]
}

export const ApolloServerPluginLogging = {
  async requestDidStart(requestContext: GraphQLRequestContext<any>) {
    const requestId = uuidv4()
    const startTime = Date.now()
    const { operationName, query, variables } = requestContext.request

    const logEntry: LogEntry = {
      timestamp: new Date().toISOString(),
      requestId,
      operationName,
      query,
      variables,
    }

    logger.debug('GraphQL Request:', JSON.stringify(logEntry, null, 2))

    return {
      async willSendResponse(requestContext: GraphQLRequestContext<any>) {
        const duration = Date.now() - startTime
        const responseLog: LogEntry = {
          ...logEntry,
          duration,
        }

        logger.debug('GraphQL Response:', JSON.stringify(responseLog, null, 2))
      },
      async didEncounterErrors(requestContext: GraphQLRequestContext<any>) {
        const errorLog: LogEntry = {
          ...logEntry,
          duration: Date.now() - startTime,
          errors: requestContext.errors,
        }
        console.error('GraphQL Errors:', JSON.stringify(errorLog, null, 2))
      },
    }
  },
}
