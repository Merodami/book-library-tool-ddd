import type { Document } from 'mongodb'

// Pattern to allow only safe field names (alphanumeric and underscore)
const FIELD_NAME_PATTERN = /^[a-zA-Z0-9_]+$/
// ISO date format pattern for stricter date string detection
const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/

/**
 * Validates that a field name is safe for direct use in MongoDB operations.
 * Prevents object-injection vulnerabilities by restricting to alphanumeric + underscore.
 * @param field - The field name to validate
 * @throws Error if the field name is invalid
 */
function assertValidFieldName(field: string) {
  if (!FIELD_NAME_PATTERN.test(field)) {
    throw new Error(`Invalid field name: "${field}"`)
  }
}

/**
 * Builds a case-insensitive regex filter for a text field.
 * @param field - Safe field name
 * @param value - User-supplied search string
 * @returns A MongoDB filter fragment or empty object
 */
export function buildTextFilter(
  field: string,
  value?: string,
): Record<string, unknown> {
  assertValidFieldName(field)
  if (typeof value !== 'string') {
    return {}
  }

  const trimmed = value.trim()

  if (!trimmed) {
    return {}
  }

  // Escape special regex characters
  const escaped = trimmed.replace(/[-\\^$*+?.()|[\]{}]/g, '\\$&')

  return { [field]: { $regex: escaped, $options: 'i' } }
}

/**
 * Builds a numeric range filter for a field.
 * Supports exact, min, and/or max criteria.
 * @param field - Safe field name
 * @param criteria - { exact, min, max }
 * @returns A MongoDB filter fragment or empty object
 */
export function buildRangeFilter(
  field: string,
  criteria: { exact?: number; min?: number; max?: number },
): Record<string, unknown> {
  assertValidFieldName(field)

  const { exact, min, max } = criteria ?? {}

  if (typeof exact === 'number') {
    return { [field]: exact }
  }

  const bounds: { $gte?: number; $lte?: number } = {}

  if (typeof min === 'number') bounds.$gte = min
  if (typeof max === 'number') bounds.$lte = max

  if (!Object.keys(bounds).length) {
    return {}
  }

  return { [field]: bounds }
}

/**
 * Builds a MongoDB projection spec.
 * If no fields are provided, excludes '_id' by default.
 * Validates each field name.
 * @param fields - Array of safe field names to include
 */
export function buildProjection(fields: string[] = []): Record<string, 0 | 1> {
  if (!Array.isArray(fields) || fields.length === 0) {
    return { _id: 0 }
  }

  const proj: Record<string, 0 | 1> = {}

  for (const f of fields) {
    assertValidFieldName(f)
    // ToDo: Resolve this eslint-disable
    /* eslint-disable security/detect-object-injection */
    proj[f] = 1
  }

  return proj
}

/**
 * Asserts that a MongoDB document contains the required fields.
 * @param doc - The document to validate
 * @param requiredFields - List of field names that must exist on doc
 * @throws Error if validation fails
 */
export function assertDocument<T extends Document>(
  doc: Document,
  requiredFields: string[],
): T {
  if (typeof doc !== 'object' || doc === null) {
    throw new Error('Document is not an object')
  }

  for (const f of requiredFields) {
    if (!(f in doc)) {
      throw new Error(`Missing required field "${f}" in document`)
    }
  }

  return doc as T
}

/**
 * Converts ISO date strings in the input object to Date instances.
 * Only converts strings that strictly match ISO_DATE_PATTERN.
 * Leaves other values untouched.
 */
export function convertDateStrings(
  obj: Record<string, unknown>,
): Record<string, unknown> {
  if (typeof obj !== 'object' || obj === null) {
    return obj
  }

  const out: Record<string, unknown> = { ...obj }

  for (const [key, val] of Object.entries(obj)) {
    if (typeof val === 'string' && ISO_DATE_PATTERN.test(val)) {
      const d = new Date(val)

      if (!isNaN(d.getTime())) {
        out[key] = d
      }
    }
  }

  return out
}
