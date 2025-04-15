import { gql } from 'graphql-tag'

export const typeDefs = gql`
  """
  A book in the library
  """
  type Book {
    """
    The unique identifier of the book
    """
    id: ID!

    """
    The title of the book
    """
    title: String!

    """
    The author of the book
    """
    author: String!

    """
    The ISBN of the book
    """
    isbn: String!

    """
    The year the book was published
    """
    publicationYear: Int!

    """
    The publisher of the book
    """
    publisher: String!

    """
    The retail price of the book
    """
    price: Float!
  }

  """
  Input type for filtering books
  """
  input BookFilter {
    title: String
    author: String
    isbn: String
    publicationYear: Int
    publisher: String
    price: Float
    # Add range filters for numeric fields
    publicationYearRange: IntRange
    priceRange: FloatRange
  }

  """
  Input type for numeric ranges
  """
  input IntRange {
    min: Int
    max: Int
  }

  """
  Input type for float ranges
  """
  input FloatRange {
    min: Float
    max: Float
  }

  """
  Input type for pagination
  """
  input PaginationInput {
    page: Int!
    limit: Int!
  }

  """
  Input type for sorting
  """
  input SortInput {
    field: String!
    order: SortOrder!
  }

  """
  Sort order enum
  """
  enum SortOrder {
    ASC
    DESC
  }

  """
  Type for paginated book results
  """
  type BookConnection {
    books: [Book!]!
    total: Int!
    page: Int!
    limit: Int!
    hasMore: Boolean!
  }

  """
  Input type for creating a book
  """
  input BookCreateInput {
    title: String!
    author: String!
    isbn: String!
    publicationYear: Int!
    publisher: String!
    price: Float!
  }

  """
  Input type for updating a book
  """
  input BookUpdateInput {
    title: String
    author: String
    publicationYear: Int
    publisher: String
    price: Float
  }

  type Query {
    """
    Get all books in the library with optional filtering, pagination, and sorting
    """
    books(
      filter: BookFilter
      pagination: PaginationInput
      sort: SortInput
    ): BookConnection!

    """
    Get a book by its ISBN
    """
    book(isbn: String!): Book
  }

  type Mutation {
    """
    Create a new book
    """
    createBook(input: BookCreateInput!): Book!

    """
    Update an existing book
    """
    updateBook(isbn: String!, input: BookUpdateInput!): Book!

    """
    Delete a book
    """
    deleteBook(isbn: String!): Boolean!
  }
`
