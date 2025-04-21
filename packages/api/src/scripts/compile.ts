import SwaggerParser from '@apidevtools/swagger-parser'
import { logger } from '@book-library-tool/shared'
import fs from 'fs-extra'
import { cloneDeep } from 'lodash-es'
import { OpenAPIV3 } from 'openapi-types'
import path from 'path'
import { fileURLToPath } from 'url'

import { OpenAPISpec } from '../openapi.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Utility: resolve paths from project root
const fromRoot = (...args: string[]) => path.join(__dirname, '../..', ...args)

/**
 * Recursively remove any $id properties from an object.
 */
function removeIdProperties(obj: any): any {
  if (Array.isArray(obj)) {
    return obj.map(removeIdProperties)
  } else if (obj && typeof obj === 'object') {
    const newObj: any = {}

    for (const key of Object.keys(obj)) {
      if (key === '$id') {
        continue
      }

      // eslint-disable-next-line security/detect-object-injection
      newObj[key] = removeIdProperties(obj[key])
    }

    return newObj
  }

  return obj
}

/**
 * Recursively remove custom keywords from an object.
 * @param obj - The object (or schema) to clean.
 * @param keysToRemove - The keys to remove. Defaults to ['errorMessage'].
 */
function removeCustomKeywords(
  obj: any,
  keysToRemove: string[] = ['errorMessage'],
): any {
  if (Array.isArray(obj)) {
    return obj.map((item) => removeCustomKeywords(item, keysToRemove))
  } else if (obj && typeof obj === 'object') {
    const newObj: any = {}

    for (const key of Object.keys(obj)) {
      if (keysToRemove.includes(key)) continue

      // eslint-disable-next-line security/detect-object-injection
      newObj[key] = removeCustomKeywords(obj[key], keysToRemove)
    }

    return newObj
  }

  return obj
}

/**
 * Remove routes that should be hidden from documentation.
 */
function removeHiddenRoutes(spec: OpenAPIV3.Document): OpenAPIV3.Document {
  // List of paths to hide from documentation
  const hiddenPaths = ['/wallets/{userId}/late-return']

  // Create a new object without the hidden paths
  const filteredPaths: Record<string, any> = {}

  for (const routePath in spec.paths) {
    if (!hiddenPaths.includes(routePath)) {
      // eslint-disable-next-line security/detect-object-injection
      filteredPaths[routePath] = spec.paths[routePath]
    }
  }

  // Create a new spec with filtered paths
  return {
    ...spec,
    paths: filteredPaths as OpenAPIV3.PathsObject,
  }
}

async function main() {
  try {
    // Clone the spec to avoid mutating the original
    const spec: OpenAPIV3.Document = cloneDeep(OpenAPISpec)

    // Remove $id properties from the spec so that it complies with OpenAPI
    const cleanedSpec = removeIdProperties(spec)

    // Remove custom keywords (like errorMessage) that are not allowed by OpenAPI
    const finalSpec = removeCustomKeywords(cleanedSpec, ['errorMessage'])

    // Create a version of the spec for documentation with hidden routes removed
    const docsSpec = removeHiddenRoutes(finalSpec)

    // Validate the cleaned OpenAPI spec (this also dereferences $refs)
    await SwaggerParser.validate(finalSpec)
    logger.info('OpenAPI spec is valid.')

    // Prepare the output directory (e.g. "dist")
    const outputDir = fromRoot('dist')

    await fs.ensureDir(outputDir)

    // Allowed file paths - defined explicitly to avoid security/detect-non-literal-fs-filename
    const apiJsonFilename = 'openapi.json'
    const docsJsonFilename = 'openapi-docs.json'
    const htmlFilename = 'openapi.html'
    const templateFilename = fromRoot('src', 'docs-template.html')

    // Generate full paths
    const apiJsonFullPath = path.join(outputDir, apiJsonFilename)
    const docsJsonFullPath = path.join(outputDir, docsJsonFilename)
    const htmlFullPath = path.join(outputDir, htmlFilename)

    // Write the complete OpenAPI spec JSON (with all routes for API usage)
    // eslint-disable-next-line security/detect-non-literal-fs-filename
    await fs.writeFile(apiJsonFullPath, JSON.stringify(finalSpec, null, 2))
    logger.info(`Complete OpenAPI JSON written to ${apiJsonFullPath}`)

    // Write the filtered documentation OpenAPI spec JSON
    // eslint-disable-next-line security/detect-non-literal-fs-filename
    await fs.writeFile(docsJsonFullPath, JSON.stringify(docsSpec, null, 2))
    logger.info(`Documentation OpenAPI JSON written to ${docsJsonFullPath}`)

    // Optionally, generate HTML documentation.

    if (await fs.pathExists(templateFilename)) {
      // eslint-disable-next-line security/detect-non-literal-fs-filename
      const template = await fs.readFile(templateFilename, 'utf8')

      // Replace placeholders in the template. Adjust placeholders as needed.
      const htmlOutput = template
        .replace('{{SPEC}}', JSON.stringify(docsSpec))
        .replace('{{TITLE}}', docsSpec.info.title)

      // eslint-disable-next-line security/detect-non-literal-fs-filename
      await fs.writeFile(htmlFullPath, htmlOutput)
      logger.info(`OpenAPI HTML documentation written to ${htmlFullPath}`)
    } else {
      logger.warn(
        `Template file not found at ${templateFilename}. Skipping HTML generation.`,
      )
    }
  } catch (error) {
    logger.error('Error compiling OpenAPI spec:', error)
    process.exit(1)
  }
}

main()
