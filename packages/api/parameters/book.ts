/**
 * Book Parameter for OpenAPI
 */
export const paramBookId = {
  in: 'path',
  name: 'id',
  description: 'The book identifier',
  required: true,
  schema: { $ref: '#/components/schemas/BookId' },
  examples: {
    bookId1: {
      summary: 'Book reference id example',
      value: '0515125628',
    },
  },
}
