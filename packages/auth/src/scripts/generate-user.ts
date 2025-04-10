import { schemas } from '@book-library-tool/api'
import { MongoDatabaseService } from '@book-library-tool/database'
import { logger } from '@book-library-tool/shared'
import { randomUUID } from 'crypto'
import { formatISO } from 'date-fns'
import Jwt from 'jsonwebtoken'

// Get the email from command-line arguments
const email = process.argv[2]

if (!email) {
  logger.error('Usage: yarn tsx ./src/scripts/create-user.ts <email>')
  process.exit(1)
}

// JWT secret from environment
const secret = process.env.JWT_SECRET || 'default-secret'

// Set current time for createdAt and updatedAt
const now = formatISO(new Date())

// Create a new user object with timestamps
const newUser: schemas.UserDTO = {
  userId: randomUUID(),
  email,
  role: 'user',
  createdAt: now,
  updatedAt: now,
}

async function createUserAndGenerateToken() {
  // Instantiate the new MongoDatabaseService
  const dbService = new MongoDatabaseService(
    process.env.MONGO_DB_NAME_LIBRARY || 'library',
  )

  // Connect to the database
  await dbService.connect()

  // Get the "users" collection in a type‑safe way
  const usersCollection = dbService.getCollection<schemas.UserDTO>('users')

  // Validate if the email already exists
  const existingUser = await usersCollection.findOne({ email })
  if (existingUser) {
    logger.error(`User with email ${email} already exists.`)
    process.exit(1)
  }

  // Insert the new user document into the collection
  await usersCollection.insertOne(newUser)

  logger.info(`\nUser created successfully with userId:\n\n${newUser.userId}`)

  // Generate the JWT token using the user's information
  const token = Jwt.sign(
    {
      userId: newUser.userId,
      email: newUser.email,
      role: newUser.role,
    },
    secret,
    { expiresIn: '24h' },
  )

  logger.info('\nGenerated JWT token:\n')
  logger.info(`${token}\n`)

  // Disconnect from the database
  await dbService.disconnect()
  process.exit(0)
}

createUserAndGenerateToken().catch((error) => {
  logger.error('Error creating user and generating token:', error)
  process.exit(1)
})
