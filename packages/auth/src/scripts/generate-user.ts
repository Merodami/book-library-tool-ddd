import { randomUUID } from 'crypto'
import Jwt from 'jsonwebtoken'
import { DatabaseService } from '@book-library-tool/database'
import { formatISO } from 'date-fns'
import { schemas } from '@book-library-tool/api'

// Get the email from command-line arguments
const email = process.argv[2]
if (!email) {
  console.error('Usage: yarn tsx ./src/scripts/create-user.ts <email>')
  process.exit(1)
}

// JWT secret from environment
const secret = process.env.JWT_SECRET || 'default-secret'

// Set current time for createdAt and updatedAt
const now = formatISO(new Date())

// Create a new user object
const newUser: schemas.User & { createdAt: string; updatedAt: string } = {
  userId: randomUUID(),
  email,
  role: 'user',
  createdAt: now,
  updatedAt: now,
}

async function createUserAndGenerateToken() {
  // Connect to the database
  const db = await DatabaseService.connect()
  const usersCollection = db.collection<schemas.User>('users')

  // Validate if the email already exists
  const existingUser = await usersCollection.findOne({ email })
  if (existingUser) {
    console.error(`User with email ${email} already exists.`)
    process.exit(1)
  }

  // Insert the new user document into the collection
  await usersCollection.insertOne(newUser)
  console.log(`\nUser created successfully with userId:\n\n${newUser.userId}`)

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

  console.log('\nGenerated JWT token:\n')
  console.log(`${token}\n`)

  await DatabaseService.disconnect()
  process.exit(0)
}

createUserAndGenerateToken().catch((error) => {
  console.error('Error creating user and generating token:', error)
  process.exit(1)
})
