import { defineConfig } from 'vitest/config'
import tsconfigPaths from 'vite-tsconfig-paths'
import { resolve } from 'path'
import { fileURLToPath, URL } from 'url'

const __dirname = fileURLToPath(new URL('.', import.meta.url))

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['./**/*.integration.test.ts', './**/*.test.ts'],
  },
  types: ['vitest/globals'],
  plugins: [
    // Using extended configuration for tsconfigPaths to handle monorepo better
    tsconfigPaths({
      loose: true,
      extensions: ['.ts', '.js', '.json'],
      projects: [
        './packages/event-store/tsconfig.json',
        './packages/books/tsconfig.json',
        './packages/database/tsconfig.json',
        './packages/reservations/tsconfig.json',
        './packages/wallets/tsconfig.json',
        './packages/api/tsconfig.json',
        './packages/shared/tsconfig.json',
        './packages/types/tsconfig.json',
      ],
    }),
  ],
  resolve: {
    alias: {
      // Event-store service
      '@event-store/error': resolve(
        __dirname,
        'packages/event-store/src/error',
      ),
      '@event-store/events': resolve(
        __dirname,
        'packages/event-store/src/domain/events',
      ),
      '@event-store/messaging': resolve(
        __dirname,
        'packages/event-store/src/infrastructure/messaging',
      ),
      '@event-store/model': resolve(
        __dirname,
        'packages/event-store/src/domain/model',
      ),
      '@event-store/persistence': resolve(
        __dirname,
        'packages/event-store/src/infrastructure/persistence',
      ),
      '@event-store/repositories': resolve(
        __dirname,
        'packages/event-store/src/domain/repositories',
      ),
      '@event-store/shared': resolve(
        __dirname,
        'packages/event-store/src/shared',
      ),

      // Books service
      '@books/entities': resolve(
        __dirname,
        'packages/books/src/domain/entities',
      ),
      '@books/repositories': resolve(
        __dirname,
        'packages/books/src/domain/repositories',
      ),
      '@books/queries': resolve(
        __dirname,
        'packages/books/src/application/use_cases/queries',
      ),
      '@books/commands': resolve(
        __dirname,
        'packages/books/src/application/use_cases/commands',
      ),
      '@books/controllers': resolve(
        __dirname,
        'packages/books/src/api/controllers',
      ),
      '@books/routes': resolve(__dirname, 'packages/books/src/api/routes'),

      // Database
      '@database/repositories': resolve(
        __dirname,
        'packages/database/src/domain/repositories',
      ),
      '@database/persistence': resolve(
        __dirname,
        'packages/database/src/infrastructure/persistence',
      ),
      '@database/testUtils': resolve(
        __dirname,
        'packages/database/src/testUtils',
      ),
    },
  },
})
//export * from '@persistence/repositories/BaseEventSourcedRepository.js'
//packages/event-store/src/index.ts
//packages/event-store/src/infrastructure/persistence/repositories/BaseEventSourcedRepository.ts
