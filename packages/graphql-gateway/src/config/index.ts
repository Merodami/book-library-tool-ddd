export interface GraphQLConfig {
  port: number
  environment: 'development' | 'production' | 'test'
  complexity: {
    maxComplexity: number
    defaultFieldComplexity: number
    listFieldMultiplier: number
    fieldWeights: Record<string, number>
  }
}

export function loadConfig(): GraphQLConfig {
  return {
    port: parseInt(process.env.GRAPHQL_SERVER_PORT || '4000', 10),
    environment: (process.env.NODE_ENV ||
      'development') as GraphQLConfig['environment'],
    complexity: {
      maxComplexity: parseInt(process.env.MAX_COMPLEXITY || '100', 10),
      defaultFieldComplexity: parseInt(
        process.env.DEFAULT_FIELD_COMPLEXITY || '1',
        10,
      ),
      listFieldMultiplier: parseInt(
        process.env.LIST_FIELD_MULTIPLIER || '2',
        10,
      ),
      fieldWeights: JSON.parse(
        process.env.FIELD_WEIGHTS || '{"books":2,"reservations":3,"user":1}',
      ),
    },
  }
}
