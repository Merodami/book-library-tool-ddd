# SDK

This package contains the SDK for accessing APIs.
It depends on the API schema output generated by the @book-library-tool/api package.

## Generating the SDK

```bash
yarn nx run sdk-gen
```

This command will generate the SDK

## Using the SDK

Call an API endpoint example

```typescript
import { api } from '@book-library-tool/sdk'
```
