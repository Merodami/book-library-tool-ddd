export const ReservationFieldEnum = {
  id: 'id',
  userId: 'userId',
  bookId: 'bookId',
  status: 'status',
  feeCharged: 'feeCharged',
  retailPrice: 'retailPrice',
  lateFee: 'lateFee',
  reservedAt: 'reservedAt',
  dueDate: 'dueDate',
} as const

export const ReservationSortFieldEnum = {
  status: 'status',
  feeCharged: 'feeCharged',
  retailPrice: 'retailPrice',
  lateFee: 'lateFee',
  reservedAt: 'reservedAt',
  dueDate: 'dueDate',
  returnedAt: 'returnedAt',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  deletedAt: 'deletedAt',
} as const
