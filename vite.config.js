import { defineConfig } from 'vitest/config'
import tsconfigPaths from 'vite-tsconfig-paths'
import { resolve } from 'path'
import { fileURLToPath, URL } from 'url'

const __dirname = fileURLToPath(new URL('.', import.meta.url))

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: [
      './**/*.integration.test.ts',
      './**/*.integration-spec.ts',
      './**/*.test.ts',
      './**/*.spec.ts',
    ],
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
      // Database
      '@database/api': resolve(__dirname, 'packages/database/src/api'),
      '@database/application': resolve(
        __dirname,
        'packages/database/src/application',
      ),
      '@database/domain': resolve(__dirname, 'packages/database/src/domain'),
      '@database/infrastructure': resolve(
        __dirname,
        'packages/database/src/infrastructure',
      ),

      // Event-store service
      '@event-store/api': resolve(__dirname, 'packages/event-store/src/api'),
      '@event-store/application': resolve(
        __dirname,
        'packages/event-store/src/application',
      ),
      '@event-store/domain': resolve(
        __dirname,
        'packages/event-store/src/domain',
      ),
      '@event-store/infrastructure': resolve(
        __dirname,
        'packages/event-store/src/infrastructure',
      ),

      // Books service
      '@books/api': resolve(__dirname, 'packages/books/src/api'),
      '@books/application': resolve(
        __dirname,
        'packages/books/src/application',
      ),
      '@books/domain': resolve(__dirname, 'packages/books/src/domain'),
      '@books/infrastructure': resolve(
        __dirname,
        'packages/books/src/infrastructure',
      ),
      '@books/tests': resolve(__dirname, 'packages/books/src/tests'),

      // Reservations
      '@reservations/api': resolve(__dirname, 'packages/reservations/src/api'),
      '@reservations/application': resolve(
        __dirname,
        'packages/reservations/src/application',
      ),
      '@reservations/domain': resolve(
        __dirname,
        'packages/reservations/src/domain',
      ),
      '@reservations/infrastructure': resolve(
        __dirname,
        'packages/reservations/src/infrastructure',
      ),

      // Wallets
      '@wallets/api': resolve(__dirname, 'packages/wallets/src/api'),
      '@wallets/application': resolve(
        __dirname,
        'packages/wallets/src/application',
      ),
      '@wallets/domain': resolve(__dirname, 'packages/wallets/src/domain'),
      '@wallets/infrastructure': resolve(
        __dirname,
        'packages/wallets/src/infrastructure',
      ),

      // API
      '@api/api': resolve(__dirname, 'packages/api/src/api'),
      '@api/application': resolve(__dirname, 'packages/api/src/application'),
      '@api/domain': resolve(__dirname, 'packages/api/src/domain'),
      '@api/infrastructure': resolve(
        __dirname,
        'packages/api/src/infrastructure',
      ),

      // Shared
      '@shared/api': resolve(__dirname, 'packages/shared/src/api'),
      '@shared/application': resolve(
        __dirname,
        'packages/shared/src/application',
      ),
      '@shared/domain': resolve(__dirname, 'packages/shared/src/domain'),
      '@shared/infrastructure': resolve(
        __dirname,
        'packages/shared/src/infrastructure',
      ),

      // SDK
      '@sdk/api': resolve(__dirname, 'packages/sdk/src/api'),
      '@sdk/application': resolve(__dirname, 'packages/sdk/src/application'),
      '@sdk/domain': resolve(__dirname, 'packages/sdk/src/domain'),
      '@sdk/infrastructure': resolve(
        __dirname,
        'packages/sdk/src/infrastructure',
      ),
    },
  },
})
