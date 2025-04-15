import { logger } from '@book-library-tool/shared'

import { startServer } from './api/app.js'

async function main() {
  try {
    await startServer()

    logger.info('GraphQL Gateway started successfully!')
  } catch (error) {
    logger.error('Failed to start server:', error)

    process.exit(1)
  }
}

main()
