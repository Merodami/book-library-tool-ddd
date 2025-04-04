import { Type, Static } from '@sinclair/typebox'
import { PaginationMetadataSchema } from './shared.js'

// --------------------------------
// Common Schema Components
// --------------------------------

// --------------------------------
// Request Schemas
// --------------------------------

/**
 * User ID Schema
 */
export const UserIdSchema = Type.Object(
  {
    userId: Type.String({ format: 'uuid' }),
  },
  { $id: '#/components/schemas/UserId' },
)
export type UserId = Static<typeof UserIdSchema>
export const UserIdRef = Type.Ref('#/components/schemas/UserId')

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
    createdAt: Type.String({ format: 'date-time' }),
    updatedAt: Type.String({ format: 'date-time' }),
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
