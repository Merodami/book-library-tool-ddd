export interface DomainBook {
  id: string
  isbn: string
  title: string
  author: string
  publicationYear: number
  publisher: string
  price: number
  version?: number
  createdAt?: Date
  updatedAt?: Date
  deletedAt?: Date
}
