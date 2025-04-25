export const BookFieldEnum = {
  id: 'id',
  title: 'title',
  author: 'author',
  isbn: 'isbn',
  publicationYear: 'publicationYear',
  publisher: 'publisher',
  price: 'price',
} as const

export const BookSortFieldEnum = {
  ...BookFieldEnum,
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  deletedAt: 'deletedAt',
} as const
