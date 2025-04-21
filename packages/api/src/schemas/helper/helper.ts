import { Type } from '@sinclair/typebox'

// --------------------------------
// Reusable Schema Components
// --------------------------------

/**
 * Creates a schema for fields selection (both array and comma-separated string)
 * @param allowedFields - Array of field names that can be selected
 * @returns TypeBox schema for fields selection
 */
export function createFieldsSelectionSchema<T extends readonly string[]>(
  allowedFields: T,
) {
  return Type.Optional(
    Type.String({
      pattern: `^(${allowedFields.join('|')})(,(${allowedFields.join('|')}))*$`,
    }),
  )
}

/**
 * Creates a schema for sorting options
 * @param allowedSortFields - Array of field names that can be used for sorting
 * @returns TypeBox schema for sort options
 */
export function createSortSchema<T extends readonly string[]>(
  allowedSortFields: T,
) {
  return {
    sortBy: Type.Optional(
      Type.Union(allowedSortFields.map((field) => Type.Literal(field))),
    ),
    sortOrder: Type.Optional(
      Type.Union([Type.Literal('asc'), Type.Literal('desc')]),
    ),
  }
}

/**
 * Creates pagination schema with configurable limits
 * @param maxLimit - Maximum number of items per page
 * @param defaultLimit - Default number of items per page
 * @returns TypeBox schema for pagination
 */
export function createPaginationSchema(
  maxLimit = parseInt(process.env.PAGINATION_MAX_LIMIT ?? '100', 10),
  defaultLimit = 10,
) {
  return {
    page: Type.Optional(Type.Number({ minimum: 1, default: 1 })),
    skip: Type.Optional(Type.Number({ minimum: 0 })),
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
 * Creates a complete pagination and sorting schema
 * @param allowedSortFields - Fields that can be used for sorting
 * @param maxLimit - Maximum items per page
 * @param defaultLimit - Default items per page
 * @returns Combined pagination and sorting schema
 */
export function createPaginationAndSortSchema<T extends readonly string[]>(
  allowedSortFields: T,
  maxLimit?: number,
  defaultLimit?: number,
) {
  return {
    ...createPaginationSchema(maxLimit, defaultLimit),
    ...createSortSchema(allowedSortFields),
  }
}
