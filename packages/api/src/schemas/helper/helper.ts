// packages/api/src/schemas/helper/helper.ts

import { TSchema, Type } from '@sinclair/typebox'

/**
 * Creates a plain pagination schema.
 */
export function createPaginationSchema(
  maxLimit = parseInt(process.env.PAGINATION_MAX_LIMIT ?? '100', 10),
  defaultLimit = parseInt(process.env.PAGINATION_DEFAULT_LIMIT ?? '10', 10),
) {
  return {
    page: Type.Optional(Type.Number({ minimum: 1, default: 1 })),
    limit: Type.Optional(
      Type.Number({
        minimum: 1,
        maximum: maxLimit,
        default: defaultLimit,
      }),
    ),
  }
}

/**
 * Creates a sort schema around any string‐union TSchema.
 * @param fieldSchema – a Type.Union literal schema (e.g. BookSortFieldSchema)
 */
export function createSortSchema<T extends TSchema>(fieldSchema: T) {
  return {
    sortBy: Type.Optional(fieldSchema),
    sortOrder: Type.Optional(
      Type.Union([Type.Literal('asc'), Type.Literal('desc')]),
    ),
  }
}

/**
 * Creates a fields‐selection query schema:
 * - either a comma-delimited string ("id,title,author")
 * - or an array of literals (["id","title","author"])
 *
 * @param fieldSchema – a Type.Union of Type.Literal(...) branches
 */
export function createFieldsSelectionSchema<T extends TSchema>(fieldSchema: T) {
  // grab the literal values out of the union's `anyOf`
  const raw: any = fieldSchema as any
  const allowed: string[] = Array.isArray(raw.anyOf)
    ? raw.anyOf
        .map((branch: any) => branch.const)
        .filter((v: any) => typeof v === 'string')
    : []

  const pattern = `^(${allowed.join('|')})(,(${allowed.join('|')}))*$`

  // CSV branch
  const csv = Type.String({
    pattern,
    description: 'Comma-separated list of fields to include',
  })

  // Array branch
  const arr = Type.Array(fieldSchema, {
    minItems: 1,
    description: 'Array of fields to include',
  })

  return Type.Optional(
    // oneOf lets OpenAPI clients send either form
    Type.Union([csv, arr], { description: 'Fields selection: CSV or array' }),
  )
}
