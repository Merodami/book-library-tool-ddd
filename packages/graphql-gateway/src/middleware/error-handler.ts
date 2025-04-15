import { GraphQLRequestContext } from '@apollo/server'
import { ApolloServerErrorCode } from '@apollo/server/errors'
import { GraphQLError } from 'graphql'

export const ApolloServerPluginErrorHandler = {
  async requestDidStart() {
    return {
      async didEncounterErrors(requestContext: GraphQLRequestContext<any>) {
        if (!requestContext.errors?.length) {
          return
        }

        // If we couldn't parse the operation document, we can't report it very well.
        if (
          requestContext.errors.some(
            (err: GraphQLError) =>
              err.extensions?.code ===
              ApolloServerErrorCode.GRAPHQL_PARSE_FAILED,
          )
        ) {
          return
        }

        // Handle errors
        requestContext.errors.forEach((error: GraphQLError) => {
          if (error instanceof GraphQLError) {
            // Log the error
            console.error('GraphQL Error:', {
              message: error.message,
              code: error.extensions?.code,
              path: error.path,
              locations: error.locations,
            })
          }
        })
      },
    }
  },
}
