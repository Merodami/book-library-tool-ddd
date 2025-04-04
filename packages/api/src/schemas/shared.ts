import { Type, Static } from '@sinclair/typebox'

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
 * Error Response Schema
 */
export const ErrorResponseSchema = Type.Object(
  {
    error: Type.String(),
    message: Type.Union([Type.String(), Type.Array(Type.String())]),
  },
  { $id: '#/components/schemas/ErrorResponse' },
)
export type ErrorResponse = Static<typeof ErrorResponseSchema>
export const ErrorResponseRef = Type.Ref('#/components/schemas/ErrorResponse')

/**
 * Helper function to create paginated response schemas
 * Note: This helper is provided for future use but isn't necessary with the explicit definitions above
 */
export const createPaginatedResponse = <T extends Static<any>>(
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
