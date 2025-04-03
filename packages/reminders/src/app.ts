import express from 'express'
import cron from 'node-cron'
import { sendReminders } from './sendReminders.js'
import { logger } from '@book-library-tool/shared'

const app = express()

// Your existing middleware, routes, etc.
app.use(express.json())

// Start your server
const SERVER_PORT = process.env.REMINDER_SERVICE_PORT || 3003

app.listen(SERVER_PORT, () => {
  logger.info(`App listening on port ${SERVER_PORT}`)

  // Schedule the reminders job to run daily at midnight
  cron.schedule('0 0 * * *', async () => {
    try {
      await sendReminders()

      console.log('Reminders sent successfully.')
    } catch (error) {
      console.error('Error sending reminders:', error)
    }
  })
})
