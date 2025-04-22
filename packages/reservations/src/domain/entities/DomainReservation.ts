import { RESERVATION_STATUS } from '@book-library-tool/types'

export interface DomainReservation {
  id?: string
  userId?: string
  bookId?: string
  status?: RESERVATION_STATUS
  feeCharged?: number
  retailPrice?: number
  version?: number
  lateFee?: number
  dueDate?: Date
  reservedAt?: Date
  createdAt?: Date
  returnedAt?: Date
  updatedAt?: Date
  deletedAt?: Date
  statusReason?: string
  payment?: {
    date?: Date
    amount?: number
    method?: string
    reference?: string
    failReason?: string
    received?: boolean
  }
}
