/**
 * Error messages used across schemas.
 */
export const ErrorMessages = {
  book: {
    isbn: {
      required: 'ISBN is required.',
      empty: 'ISBN cannot be empty.',
    },
    title: {
      required: 'Title is required.',
      empty: 'Title cannot be empty.',
    },
    author: {
      required: 'Author is required.',
      empty: 'Author cannot be empty.',
    },
    publicationYear: {
      required: 'Publication year is required.',
      type: 'Publication year must be a number.',
      min: 'Publication year must be greater than or equal to 0.',
    },
    publisher: {
      required: 'Publisher is required.',
      empty: 'Publisher cannot be empty.',
    },
    price: {
      required: 'Price is required.',
      type: 'Price must be a number.',
      min: 'Price must be non-negative.',
    },
    createdAt: {
      format: 'CreatedAt must be a valid date-time string.',
    },
    updatedAt: {
      format: 'UpdatedAt must be a valid date-time string.',
    },
    deletedAt: {
      format: 'DeletedAt must be a valid date-time string.',
    },
  },
  catalog: {
    title: {
      empty: 'Title must not be empty.',
    },
    author: {
      empty: 'Author must not be empty.',
    },
    publicationYear: {
      type: 'Publication year must be a number.',
    },
    page: {
      min: 'Page number must be at least 1.',
    },
    limit: {
      min: 'Limit must be at least 1.',
      max: (max: number) => `Limit must not exceed ${max}.`,
    },
  },
  reservation: {
    reservationId: {
      required: 'Reservation ID is required.',
      empty: 'Reservation ID cannot be empty.',
    },
    userId: {
      required: 'User ID is required.',
      format: 'User ID must be a valid UUID.',
    },
    isbn: {
      required: 'ISBN is required.',
      empty: 'ISBN cannot be empty.',
    },
    reservedAt: {
      required: 'Reservation date is required.',
      format: 'ReservedAt must be a valid date-time string.',
    },
    dueDate: {
      required: 'Due date is required.',
      format: 'Due date must be a valid date-time string.',
    },
    status: {
      required: 'Status is required.',
      enum: 'Status must be one of the allowed values.',
    },
    feeCharged: {
      required: 'Fee charged is required.',
      type: 'Fee charged must be a number.',
    },
    createdAt: {
      format: 'CreatedAt must be a valid date-time string.',
    },
    updatedAt: {
      format: 'UpdatedAt must be a valid date-time string.',
    },
    deletedAt: {
      format: 'DeletedAt must be a valid date-time string.',
    },
  },
  user: {
    userId: {
      required: 'User ID is required.',
      format: 'User ID must be a valid UUID.',
    },
    email: {
      required: 'Email is required.',
      format: 'Email must be a valid email address.',
    },
    role: {
      required: 'Role is required.',
      empty: 'Role cannot be empty.',
    },
    createdAt: {
      format: 'CreatedAt must be a valid date-time string.',
    },
    updatedAt: {
      format: 'UpdatedAt must be a valid date-time string.',
    },
    deletedAt: {
      format: 'DeletedAt must be a valid date-time string.',
    },
  },
  wallet: {
    userId: {
      required: 'User ID is required.',
      format: 'User ID must be a valid UUID.',
    },
    balance: {
      required: 'Balance is required.',
      type: 'Balance must be a number.',
    },
    createdAt: {
      format: 'CreatedAt must be a valid date-time string.',
    },
    updatedAt: {
      format: 'UpdatedAt must be a valid date-time string.',
    },
    deletedAt: {
      format: 'DeletedAt must be a valid date-time string.',
    },
  },
  lateReturn: {
    daysLate: {
      required: 'Days late is required.',
      min: 'Days late must be at least 0.',
    },
    retailPrice: {
      required: 'Retail price is required.',
      min: 'Retail price must be non-negative.',
    },
  },
  walletBalance: {
    amount: {
      required: 'Amount is required.',
      type: 'Amount must be a number.',
    },
  },
  shared: {
    pagination: {
      total: {
        required: 'Total is required.',
        type: 'Total must be a number.',
      },
      page: {
        required: 'Page number is required.',
        type: 'Page must be a number.',
        min: 'Page number must be at least 1.',
      },
      limit: {
        required: 'Limit is required.',
        type: 'Limit must be a number.',
        min: 'Limit must be at least 1.',
        max: (max: number) => `Limit must not exceed ${max}.`,
      },
      paginatedResponse: {
        data: {
          type: 'Data must be an array.',
        },
        required: {
          data: 'Data is required.',
          pagination: 'Pagination metadata is required.',
        },
      },
      pages: {
        required: 'Pages is required.',
        type: 'Pages must be a number.',
      },
      hasNext: {
        required: 'hasNext flag is required.',
        type: 'hasNext must be a boolean.',
      },
      hasPrev: {
        required: 'hasPrev flag is required.',
        type: 'hasPrev must be a boolean.',
      },
    },
  },
}
