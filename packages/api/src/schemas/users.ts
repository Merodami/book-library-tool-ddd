import { Static, Type } from '@sinclair/typebox'

import { PaginationMetadataSchema } from './pagination.js'

// --------------------------------
// Parameter Schemas
// --------------------------------

/**
 * User Parameter Schema
 */
export const UserIdParameterSchema = Type.Object(
  {
    userId: Type.String({ format: 'uuid' }),
  },
  {
    $id: '#/components/parameters/UserIdParameter',
    description: 'User identifier (UUID)',
  },
)
export type UserIdParameter = Static<typeof UserIdParameterSchema>
export const UserIdParameterRef = Type.Ref(
  '#/components/parameters/UserIdParameter',
)

// --------------------------------
// Response Schemas
// --------------------------------

/**
 * User Schema
 */
export const UserSchema = Type.Object(
  {
    userId: Type.String({ format: 'uuid' }),
    email: Type.String({ format: 'email' }),
    role: Type.String({ minLength: 1 }),
    createdAt: Type.Optional(Type.String({ format: 'date-time' })),
    updatedAt: Type.Optional(Type.String({ format: 'date-time' })),
    deletedAt: Type.Optional(Type.String({ format: 'date-time' })),
  },
  { $id: '#/components/schemas/User' },
)
export type User = Static<typeof UserSchema>
export const UserRef = Type.Ref('#/components/schemas/User')

// --------------------------------
// Paginated Response Schemas
// --------------------------------

/**
 * Paginated User Response Schema
 */
export const PaginatedUserResponseSchema = Type.Object(
  {
    data: Type.Array(UserRef),
    pagination: PaginationMetadataSchema,
  },
  { $id: '#/components/schemas/PaginatedUserResponse' },
)
export type PaginatedUserResponse = Static<typeof PaginatedUserResponseSchema>
export const PaginatedUserResponseRef = Type.Ref(
  '#/components/schemas/PaginatedUserResponse',
)
