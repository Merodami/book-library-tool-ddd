import { Collection } from 'mongodb'
import { Reservation } from '@entities/Reservation.js'
import { IReservationRepository } from '@repositories/IReservationRepository.js'
import { MongoDatabaseService } from '@book-library-tool/database'
import { RESERVATION_STATUS } from '@book-library-tool/types'
import { schemas } from '@book-library-tool/api'

export class ReservationRepository implements IReservationRepository {
  constructor(private readonly dbService: MongoDatabaseService) {}

  async create(reservation: Reservation): Promise<void> {
    const collection: Collection<Reservation> =
      this.dbService.getCollection<Reservation>('reservations')

    // Convert Date objects to ISO strings if needed.
    await collection.insertOne(reservation)
  }

  async findById(reservationId: string): Promise<Reservation | null> {
    const collection: Collection<Reservation> =
      this.dbService.getCollection<Reservation>('reservations')

    const reservation = await collection.findOne({ reservationId })

    if (!reservation) return null

    return Reservation.rehydrate({
      reservationId: reservation.reservationId,
      userId: reservation.userId,
      isbn: reservation.isbn,
      status: reservation.status as RESERVATION_STATUS,
      feeCharged: reservation.feeCharged,
      reservedAt: reservation.reservedAt.toISOString(),
      dueDate: reservation.dueDate.toISOString(),
      createdAt: reservation.createdAt.toISOString(),
      updatedAt: reservation.updatedAt.toISOString(),
      deletedAt: reservation.deletedAt
        ? reservation.deletedAt.toISOString()
        : undefined,
    })
  }

  async findByUserId(userId: string): Promise<Reservation[]> {
    const collection: Collection<schemas.ReservationDTO> =
      this.dbService.getCollection<schemas.ReservationDTO>('reservations')

    const reservations = await collection.find({ userId }).toArray()

    return reservations.map((reservation) =>
      Reservation.rehydrate({
        reservationId: reservation.reservationId,
        userId: reservation.userId,
        isbn: reservation.isbn,
        feeCharged: 3,
        reservedAt: reservation.reservedAt,
        dueDate: reservation.dueDate,
        status: reservation.status as RESERVATION_STATUS,
        createdAt: reservation.createdAt,
        updatedAt: reservation.updatedAt,
      }),
    )
  }

  async updateStatus(
    reservationId: string,
    newStatus: RESERVATION_STATUS,
  ): Promise<void> {
    const collection: Collection<Reservation> =
      this.dbService.getCollection<Reservation>('reservations')

    await collection.updateOne(
      { reservationId },
      { $set: { status: newStatus, updatedAt: new Date() } },
    )
  }
}
