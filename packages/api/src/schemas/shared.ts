import { Type } from '@sinclair/typebox'
import { Static } from '@sinclair/typebox/type'

/**
 * Reservation Return Params Schema
 */
export const IdParameterSchema = Type.Object(
  {
    id: Type.String({
      format: 'uuid',
      minLength: 1,
    }),
  },
  { $id: '#/components/parameters/IdParameter' },
)
export type IdParameter = Static<typeof IdParameterSchema>
export const IdParameterRef = Type.Ref('#/components/parameters/IdParameter')
