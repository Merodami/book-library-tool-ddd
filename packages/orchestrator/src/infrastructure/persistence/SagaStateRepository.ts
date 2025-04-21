import { MongoDatabaseService } from '@book-library-tool/database'

import { ReservationPaymentSagaState } from '../../application/sagas/reservation-payment/ReservationPaymentSagaState'
import { SagaRepository } from '../../domain/SagaRepository'

const SAGA_COLLECTION = 'reservation_payment_sagas'

export class SagaStateRepository
  implements SagaRepository<ReservationPaymentSagaState>
{
  constructor(private readonly db: MongoDatabaseService) {}

  async findById(id: string): Promise<ReservationPaymentSagaState | null> {
    const result = await this.db.getCollection(SAGA_COLLECTION).findOne({ id })

    return result || null
  }

  async findByReservationId(
    reservationId: string,
  ): Promise<ReservationPaymentSagaState | null> {
    const result = await this.db
      .getCollection(SAGA_COLLECTION)
      .findOne({ reservationId })

    return result || null
  }

  async save(state: ReservationPaymentSagaState): Promise<void> {
    await this.db
      .getCollection(SAGA_COLLECTION)
      .updateOne(
        { id: state.id },
        { $set: { ...state, updatedAt: new Date() } },
        { upsert: true },
      )
  }
}
