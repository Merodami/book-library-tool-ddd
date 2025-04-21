/**
 * Formats AJV errors into an array of simplified error messages.
 *
 * @param errors - The AJV errors array.
 * @returns An array with simplified error messages.
 */
export function formatErrors(errors: any[]): string[] {
  return errors.map((error) => {
    // For errorMessage errors, use the provided custom message.
    if (error.keyword === 'errorMessage') {
      // error.instancePath might be empty; default to 'Field'
      const field = error.instancePath ? error.instancePath.slice(1) : 'Field'

      return `${field}: ${error.message}`
    }
    // For required property errors.
    if (error.keyword === 'required') {
      return `${error.params.missingProperty} is required.`
    }

    // Otherwise, fallback to a default message.
    return `${error.instancePath ? error.instancePath : 'Field'}: ${error.message}`
  })
}
