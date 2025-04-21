import { ObjectId } from 'mongodb'

/**
 * Database document representation of a reservation with MongoDB native types
 */
export interface ReservationDocument {
  _id: ObjectId
  id: string
  userId: string
  bookId: string
  reservedAt: Date
  dueDate: Date
  status: string
  feeCharged: number
  retailPrice: number
  createdAt: Date
  updatedAt?: Date | null
  deletedAt?: Date | null
}
