export * as schemas from './schemas/index.js'
export type { WalletDTO } from './schemas/wallets.js'
export {
  makeValidator,
  validateBody,
  validateParams,
  validateQuery,
} from './src/validation.js'
