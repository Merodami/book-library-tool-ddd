

declare module 'openapi-types' {
  namespace OpenAPIV3 {
    interface Document {
      'x-amazon-apigateway-binary-media-types'?: string[]
      'x-amazon-apigateway-gateway-responses'?: any
      'x-amazon-apigateway-request-validators'?: Record<
        string,
        {
          validateRequestParameters: boolean
          validateRequestBody: boolean
        }
      >
      'x-ticknovate'?: {
        /**
         * Whether to enable API Gateway caching.
         * Beware, even 0.5GB costs about 14 USD per month. Do not casually
         * add this to all gateways.
         *
         * NOTE: If adding this on a new gateway, make sure to add that gateway ID to
         * the `flushApiGatewayCache` function, as we have not yet set that
         * up to read the config from this package. It's imagined that we will
         * consolidate to a single gateway before the need arises.
         */
        cacheEnabled?: boolean
        dangerousHeaderPassthrough?: true
        dangerousHeadersStrip?: true
        defaults?: { method: { security: [{ [k: string]: [] }] } }
      }
      'x-amazon-apigateway-policy'?: any
      'x-amazon-apigateway-minimum-compression-size'?: number
    }

    interface ApiKeySecurityScheme {
      'x-amazon-apigateway-authtype'?: 'awsSigv4' | 'custom'
      'x-amazon-apigateway-authorizer'?: unknown
    }
  }
}
