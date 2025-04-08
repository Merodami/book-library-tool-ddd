/**
 * Book Parameter for OpenAPI
 */
export const paramBookId = {
  in: 'path',
  name: 'isbn',
  description: 'The book identifier',
  required: true,
  schema: { type: 'string', minLength: 1 },
  examples: {
    bookId1: {
      summary: 'Book reference id example',
      value: '0515125628',
    },
  },
}
