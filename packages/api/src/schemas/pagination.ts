import { Static, TSchema, Type } from '@sinclair/typebox'

/**
 * Metadata describing pagination state.
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
export const PaginationMetadataRef = Type.Ref(PaginationMetadataSchema)

/**
 * Creates a TypeBox schema for a paginated response of any item type.
 * @param itemSchema - TypeBox schema for the array items
 * @param schemaId   - JSON Schema $id for the paginated response
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
 * Generic interface for paginated results that can work with any type T
 */
export interface PaginatedResult<T> {
  data: T[]
  pagination: PaginationMetadata
}

// Pre-built generic result schema for validation
export const PaginatedResultSchema = createPaginatedResponseSchema(
  Type.Any(),
  '#/components/schemas/PaginatedResult',
)
export type PaginatedResultSchemaType = Static<typeof PaginatedResultSchema>
export const PaginatedResultRef = Type.Ref(PaginatedResultSchema)

// ─── Runtime Helper ─────────────────────────────────────────────────────────

/**
 * Build a paginated response object at runtime.
 * @param items - The data array
 * @param page  - Current page number
 * @param limit - Items per page
 * @param total - Total number of items
 */
export function createPaginatedResponse<T>(
  items: T[],
  page: number,
  limit: number,
  total: number,
): PaginatedResult<T> {
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
