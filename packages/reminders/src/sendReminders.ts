import { DatabaseService } from '@book-library-tool/database'
import { Reservation } from '@book-library-tool/sdk'

const TWO_DAYS_MS = 2 * 24 * 60 * 60 * 1000
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000

/**
 * Default email sender that logs the email to the console.
 * In production, replace with an actual email sending implementation.
 */
export async function defaultEmailSender(
  to: string,
  subject: string,
  body: string,
): Promise<void> {
  console.log(`Sending email to ${to}:\nSubject: ${subject}\nBody:\n${body}\n`)
}

/**
 * sendReminders
 *
 * Checks reservations and sends reminder emails.
 *
 * - Upcoming due reminders: For reservations with dueDate between now and now+2 days.
 * - Late return reminders: For reservations with dueDate older than now-7 days.
 *
 * @param emailSender - (Optional) Function to send emails; defaults to defaultEmailSender.
 */
export async function sendReminders(
  emailSender: (
    to: string,
    subject: string,
    body: string,
  ) => Promise<void> = defaultEmailSender,
): Promise<void> {
  try {
    const db = await DatabaseService.connect()
    const reservationsCollection = db.collection<Reservation>('reservations')
    const now = new Date()

    // --- Upcoming Due Date Reminders ---
    const upcomingReservations = await reservationsCollection
      .find({
        dueDate: {
          $gte: now.toISOString(),
          $lte: new Date(now.getTime() + TWO_DAYS_MS).toISOString(),
        },
        status: { $in: ['reserved', 'borrowed', 'late'] },
      })
      .toArray()

    for (const reservation of upcomingReservations) {
      const dueDate = new Date(reservation.dueDate)
      const timeLeftMs = dueDate.getTime() - now.getTime()
      const daysLeft = Math.ceil(timeLeftMs / (24 * 60 * 60 * 1000))
      const userEmail = `${reservation.userId}@example.com`
      const subject = 'Reminder: Upcoming Due Date'
      const body = `Hello,
      
This is a reminder that your reservation (${reservation.reservationId}) for book reference ${reservation.referenceId} is due in ${daysLeft} day(s) on ${reservation.dueDate}.
      
Please return the book on time to avoid late fees.
      
Thank you.`
      await emailSender(userEmail, subject, body)
    }

    // --- Late Return Reminders ---
    const lateReservations = await reservationsCollection
      .find({
        dueDate: {
          $lte: new Date(now.getTime() - SEVEN_DAYS_MS).toISOString(),
        },
        status: { $in: ['reserved', 'borrowed', 'late'] },
      })
      .toArray()

    for (const reservation of lateReservations) {
      const dueDate = new Date(reservation.dueDate)
      const daysLate = Math.floor(
        (now.getTime() - dueDate.getTime()) / (24 * 60 * 60 * 1000),
      )
      const userEmail = `${reservation.userId}@example.com`
      const subject = 'Reminder: Late Return'
      const body = `Hello,
      
Our records show that your reservation (${reservation.reservationId}) for book reference ${reservation.referenceId} was due on ${reservation.dueDate} and is now ${daysLate} day(s) overdue.
      
Please return the book as soon as possible to avoid further late fees.
      
Thank you.`
      await emailSender(userEmail, subject, body)
    }

    console.log('Reminders processing complete.')
  } catch (error) {
    console.error('Error sending reminders:', error)
    throw error
  }
}
