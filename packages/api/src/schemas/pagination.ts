import { Static, TSchema, Type } from '@sinclair/typebox'

// --------------------------------
// Common Schema Components
// --------------------------------

/**
 * Pagination Metadata Schema
 */
export const PaginationMetadataSchema = Type.Object(
  {
    total: Type.Number(),
    page: Type.Number(),
    limit: Type.Number(),
    pages: Type.Number(),
    hasNext: Type.Boolean(),
    hasPrev: Type.Boolean(),
  },
  { $id: '#/components/schemas/PaginationMetadata' },
)

export type PaginationMetadata = Static<typeof PaginationMetadataSchema>
export const PaginationMetadataRef = Type.Ref(
  '#/components/schemas/PaginationMetadata',
)

/**
 * Pagination Query Parameters Schema
 */
export const PaginationQuerySchema = Type.Object(
  {
    page: Type.Optional(Type.Number({ minimum: 1, default: 1 })),
    limit: Type.Optional(
      Type.Number({ minimum: 1, maximum: 100, default: 20 }),
    ),
  },
  { $id: '#/components/schemas/PaginationQuery' },
)

export type PaginationQuery = Static<typeof PaginationQuerySchema>
export const PaginationQueryRef = Type.Ref(
  '#/components/schemas/PaginationQuery',
)

/**
 * Generic Paginated Result Schema
 */
export const PaginatedResultSchema = Type.Object(
  {
    data: Type.Array(Type.Any()),
    pagination: PaginationMetadataSchema,
  },
  { $id: '#/components/schemas/PaginatedResult' },
)

export const PaginatedResultRef = Type.Ref(
  '#/components/schemas/PaginatedResult',
)

/**
 * Generic Paginated Response Schema
 * This can be used to create paginated response schemas for any entity type
 */
export function createPaginatedResponseSchema<T extends TSchema>(
  itemSchema: T,
  schemaId: string,
) {
  return Type.Object(
    {
      data: Type.Array(itemSchema),
      pagination: PaginationMetadataSchema,
    },
    { $id: schemaId },
  )
}

/**
 * Helper function to create paginated response instances
 */
export const createPaginatedResponse = <T>(
  items: T[],
  page: number,
  limit: number,
  total: number,
) => {
  const pages = Math.ceil(total / limit)

  return {
    data: items,
    pagination: {
      total,
      page,
      limit,
      pages,
      hasNext: page < pages,
      hasPrev: page > 1,
    },
  }
}
