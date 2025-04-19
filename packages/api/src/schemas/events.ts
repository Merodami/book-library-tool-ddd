import { Static, Type } from '@sinclair/typebox'

// --------------------------------
// Response Schemas
// --------------------------------

/**
 * Event Response Schema
 */
export const EventResponseSchema = Type.Object(
  {
    success: Type.Boolean(),
    version: Type.Number(),
  },
  { $id: '#/components/schemas/EventResponse' },
)
export type EventResponse = Static<typeof EventResponseSchema>
export const EventResponseRef = Type.Ref('#/components/schemas/EventResponse')
