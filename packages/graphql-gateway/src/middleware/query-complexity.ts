import { ErrorCode, logger } from '@book-library-tool/shared'
import { GraphQLError } from 'graphql'
import { ValidationRule } from 'graphql/validation'
import { createComplexityRule, simpleEstimator } from 'graphql-query-complexity'

import { loadConfig } from '../config/index.js'

export const createQueryComplexityPlugin = (): ValidationRule => {
  const config = loadConfig()

  return createComplexityRule({
    maximumComplexity: config.complexity.maxComplexity,
    variables: {},
    estimators: [
      // Use simple estimator with default complexity from config
      simpleEstimator({
        defaultComplexity: config.complexity.defaultFieldComplexity,
      }),
    ],
    createError: (max: number, actual: number) => {
      return new GraphQLError(
        `Query complexity of ${actual} exceeds maximum allowed complexity of ${max}`,
        {
          extensions: {
            code: ErrorCode.COMPLEXITY_LIMIT_EXCEEDED,
            complexity: actual,
            maxComplexity: max,
          },
        },
      )
    },
    onComplete: (complexity: number) => {
      logger.debug('Query Complexity:', complexity)
    },
  })
}
