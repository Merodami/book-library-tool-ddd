import { describe, beforeEach, afterEach, test, expect, vi } from 'vitest'
import type { Mock } from 'vitest'
import { sendReminders } from './sendReminders.js'
import { DatabaseService } from '@book-library-tool/database'

// Mock DatabaseService.connect to return a fake database object.
vi.mock('@book-library-tool/database', () => ({
  DatabaseService: {
    connect: vi.fn(),
  },
}))

describe('sendReminders', () => {
  let fakeDb: any
  let fakeReservationsCollection: any
  let emailSenderMock: any

  beforeEach(() => {
    // Setup a fake collection with a mock implementation of find().
    fakeReservationsCollection = {
      find: vi.fn(),
    }
    fakeDb = {
      collection: vi.fn().mockReturnValue(fakeReservationsCollection),
    }

    // Cast DatabaseService.connect to a vi.Mock so that TS knows about mockResolvedValue.
    ;(DatabaseService.connect as unknown as Mock).mockResolvedValue(fakeDb)

    emailSenderMock = vi.fn().mockResolvedValue(undefined)
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  test('should send an upcoming due reminder email', async () => {
    const now = new Date()

    // Create a reservation with due date 1 day from now.
    const upcomingReservation = {
      reservationId: 'res1',
      userId: 'user1',
      referenceId: 'book1',
      reservedAt: now.toISOString(),
      dueDate: new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'reserved',
      feeCharged: 3,
    }

    // First call to find() returns upcoming reservations; second call returns an empty array.
    fakeReservationsCollection.find
      .mockReturnValueOnce({
        toArray: vi.fn().mockResolvedValue([upcomingReservation]),
      })
      .mockReturnValueOnce({
        toArray: vi.fn().mockResolvedValue([]),
      })

    await sendReminders(emailSenderMock)

    // Expect emailSenderMock to have been called once.
    expect(emailSenderMock).toHaveBeenCalledTimes(1)

    const [to, subject, body] = emailSenderMock.mock.calls[0]

    expect(to).toBe('user1@example.com')
    expect(subject).toContain('Upcoming Due Date')
    expect(body).toContain(upcomingReservation.reservationId)
  })

  test('should send a late return reminder email', async () => {
    const now = new Date()

    // Create a reservation with due date 10 days ago.
    const lateReservation = {
      reservationId: 'res2',
      userId: 'user2',
      referenceId: 'book2',
      reservedAt: now.toISOString(),
      dueDate: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'reserved',
      feeCharged: 3,
    }

    // First call to find() returns empty array for upcoming; second call returns late reservations.
    fakeReservationsCollection.find
      .mockReturnValueOnce({
        toArray: vi.fn().mockResolvedValue([]),
      })
      .mockReturnValueOnce({
        toArray: vi.fn().mockResolvedValue([lateReservation]),
      })

    await sendReminders(emailSenderMock)

    // Expect emailSenderMock to have been called once.
    expect(emailSenderMock).toHaveBeenCalledTimes(1)

    const [to, subject, body] = emailSenderMock.mock.calls[0]

    expect(to).toBe('user2@example.com')
    expect(subject).toContain('Late Return')
    expect(body).toContain(lateReservation.reservationId)
  })

  test('should send both upcoming and late reminder emails when applicable', async () => {
    const now = new Date()
    const upcomingReservation = {
      reservationId: 'res1',
      userId: 'user1',
      referenceId: 'book1',
      reservedAt: now.toISOString(),
      dueDate: new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'reserved',
      feeCharged: 3,
    }
    const lateReservation = {
      reservationId: 'res2',
      userId: 'user2',
      referenceId: 'book2',
      reservedAt: now.toISOString(),
      dueDate: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'reserved',
      feeCharged: 3,
    }

    fakeReservationsCollection.find
      .mockReturnValueOnce({
        toArray: vi.fn().mockResolvedValue([upcomingReservation]),
      })
      .mockReturnValueOnce({
        toArray: vi.fn().mockResolvedValue([lateReservation]),
      })

    await sendReminders(emailSenderMock)

    // Expect emailSenderMock to have been called twice.
    expect(emailSenderMock).toHaveBeenCalledTimes(2)

    const call1 = emailSenderMock.mock.calls[0]
    const call2 = emailSenderMock.mock.calls[1]

    // Check that one call is for upcoming and one is for late.
    expect([call1[1], call2[1]]).toEqual(
      expect.arrayContaining([
        'Reminder: Upcoming Due Date',
        'Reminder: Late Return',
      ]),
    )
  })
})
