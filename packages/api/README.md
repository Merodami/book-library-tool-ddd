# API

This package contains [OpenAPI](https://github.com/OAI/OpenAPI-Specification) API specifications, and [JSON Schemas](https://json-schema.org/) related to the APIs.

This is the package to update if you want to expose a REST endpoint for the PlayPair frontends to use.

## API specification

The [API specs](./src/gateways) serve two main purposes:

1. **The API specs can be uploaded and deployed directly to [Amazon API Gateway](https://aws.amazon.com/api-gateway/).** They have all of the necessary `x-amazon-apigateway-*` extensions to let AWS know exactly which services / lambdas / s3 buckets to hit when a user calls each endpoint.

They also have schemas to enable the gateway to validate requests.

2. **They act as API documentation.** `yarn build` will generate HTML files in addition to raw JSON specs. These are served at the root of each API, so users can browse the API documentation directly and even download the specs as JSON (with the integration extensions stripped out).

## Schemas and types

The [same schemas used to validate requests](./src/gateways/components/schemas) are also exported from this package, with full TypeScript type inference. You can import them in another package and use them like this:

```ts
import type { schemas } from '@book-library-tool/api'

const order: schemas.Order = {
  ...
}
```

You can also import the schema value (not just the type):

```ts
import { schemas } from '@book-library-tool/api'

// This is pseudocode, where `validate` is an imagined function that
// acts as a type guard, throwing an error if the type of `req.body`
// does not match.
//
// Libraries like "ajv" are capable of this.
const order = validate(schemas.Order, req.body)
```

Before using a schema for validation, consider that Amazon API Gateway will do this automatically for us when using the `x-amazon-apigateway-request-validator` extension.
