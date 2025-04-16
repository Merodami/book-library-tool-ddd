import { TSchema } from '@sinclair/typebox'
import type { OpenAPIV3 } from 'openapi-types'

/**
 * Registry for managing TypeBox schemas and generating OpenAPI specifications
 */
class SchemaRegistry {
  private schemas = new Map<string, TSchema>()

  /**
   * Register a schema with the registry
   */
  register<T extends TSchema>(name: string, schema: T): T {
    if (this.schemas.has(name)) {
      return schema
    }

    this.schemas.set(name, schema)
    return schema
  }

  /**
   * Get a schema by name
   */
  get<T extends TSchema>(name: string): T {
    const schema = this.schemas.get(name)
    if (!schema) {
      throw new Error(`Schema "${name}" not found in registry`)
    }
    return schema as T
  }

  /**
   * Create a reference to a schema
   */
  ref(name: string): OpenAPIV3.ReferenceObject {
    return { $ref: `#/components/schemas/${name}` }
  }

  /**
   * Check if a schema exists
   */
  has(name: string): boolean {
    return this.schemas.has(name)
  }

  /**
   * Get all schema names
   */
  getSchemaNames(): string[] {
    return Array.from(this.schemas.keys())
  }

  /**
   * Generate OpenAPI components
   */
  generateComponents(): OpenAPIV3.ComponentsObject {
    const schemas: Record<
      string,
      OpenAPIV3.SchemaObject | OpenAPIV3.ReferenceObject
    > = {}

    // Use a safer approach to build the schemas object
    this.schemas.forEach((schema, name) => {
      // This avoids direct indexed assignment
      Object.assign(schemas, { [name]: this.toOpenAPISchema(schema) })
    })

    return { schemas }
  }

  /**
   * Convert TypeBox schema to OpenAPI schema
   */
  private toOpenAPISchema(
    schema: TSchema,
  ): OpenAPIV3.SchemaObject | OpenAPIV3.ReferenceObject {
    const jsonSchema = JSON.parse(JSON.stringify(schema))

    const cleanSchema = (obj: any): any => {
      if (!obj || typeof obj !== 'object') return obj

      if (Array.isArray(obj)) {
        return obj.map(cleanSchema)
      }

      const cleaned: any = {}

      for (const [key, value] of Object.entries(obj)) {
        // Skip TypeBox metadata
        if (['$schema', 'const', 'kind', 'modifier'].includes(key)) {
          continue
        }

        if (['anyOf', 'allOf', 'oneOf'].includes(key)) {
          // Use Object.assign to avoid direct property assignment
          Object.assign(cleaned, { [key]: (value as any[]).map(cleanSchema) })
        } else if (typeof value === 'object' && value !== null) {
          // Use Object.assign to avoid direct property assignment
          Object.assign(cleaned, { [key]: cleanSchema(value) })
        } else {
          // Use Object.assign to avoid direct property assignment
          Object.assign(cleaned, { [key]: value })
        }
      }

      return cleaned
    }

    return cleanSchema(jsonSchema)
  }
}

// Export a singleton instance
export const registry = new SchemaRegistry()
