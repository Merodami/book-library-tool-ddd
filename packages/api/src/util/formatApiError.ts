import { ErrorObject } from 'ajv'

export const formatApiErrors = (
  errors: ErrorObject[] | null | undefined,
): string[] => {
  if (!errors) return []

  return errors.map((err) => {
    // Remove leading slash from instancePath (e.g., "/id" -> "id")
    const field = err.instancePath ? err.instancePath.substring(1) : 'data'
    return `${field || 'data'} ${err.message}`
  })
}
