import { paramUserId } from '../parameters/user.js'
import { registry } from '../schemaRegistry.js'
import {
  LateReturnRequestSchema,
  UserSchema,
  WalletBalanceRequestSchema,
  WalletSchema,
} from '../schemas/index.js'

/**
 * Wallets API Specification
 */
export const WalletsAPISpec: any = {
  paths: {
    '/api/wallets/{userId}': {
      get: {
        tags: ['Wallets'],
        operationId: 'getWallet',
        summary: 'Retrieve a user wallet',
        parameters: [paramUserId],
        responses: {
          '200': {
            description: 'User wallet details',
            content: {
              'application/json': {
                schema: registry.ref('Wallet'),
                examples: {
                  userWallet: {
                    summary: 'User wallet information',
                    value: {
                      userId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
                      balance: 50.5,
                    },
                  },
                },
              },
            },
          },
          '400': registry.refResponse('BadRequestError'),
          '401': registry.refResponse('UnauthorizedError'),
          '404': registry.refResponse('NotFoundError'),
        },
        security: [{ ApiTokenAuth: [] }],
      },
    },
    '/api/wallets/{userId}/balance': {
      post: {
        tags: ['Wallets'],
        operationId: 'modifyWalletBalance',
        summary: 'Modify balance of a user wallet',
        parameters: [paramUserId],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: registry.ref('BalanceWalletRequest'),
              examples: {
                addFunds: {
                  summary: 'Add funds to wallet',
                  value: {
                    amount: 20,
                  },
                },
                deductFunds: {
                  summary: 'Deduct funds from wallet',
                  value: {
                    amount: -3,
                  },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Wallet updated successfully',
            content: {
              'application/json': {
                schema: registry.ref('Wallet'),
                examples: {
                  updatedWallet: {
                    summary: 'Updated wallet balance',
                    value: {
                      userId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
                      balance: 20,
                    },
                  },
                },
              },
            },
          },
          '400': registry.refResponse('BadRequestError'),
          '401': registry.refResponse('UnauthorizedError'),
          '404': registry.refResponse('NotFoundError'),
        },
        security: [{ ApiTokenAuth: [] }],
      },
    },
    '/api/wallets/{userId}/late-return': {
      patch: {
        tags: ['Wallets'],
        operationId: 'applyLateFee',
        summary: 'Apply a late fee to a user wallet',
        parameters: [paramUserId],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: registry.ref('LateReturnRequest'),
              examples: {
                lateFee: {
                  summary: 'Late return fee calculation',
                  value: {
                    daysLate: 5,
                    retailPrice: 36,
                  },
                },
                longOverdue: {
                  summary: 'Long overdue book',
                  value: {
                    daysLate: 120,
                    retailPrice: 42.99,
                  },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description:
              'Late fee applied. If fees reach or exceed the retail price, the book is considered brought.',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    message: { type: 'string' },
                    wallet: registry.ref('Wallet'),
                  },
                },
                examples: {
                  feeApplied: {
                    summary: 'Late fee applied',
                    value: {
                      message:
                        'Late fee of €1.00 applied for 5 days late return.',
                      wallet: {
                        userId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
                        balance: 49.5,
                        createdAt: '2025-01-15T08:30:00.000Z',
                        updatedAt: '2025-04-01T15:30:10.789Z',
                      },
                    },
                  },
                  bookBrought: {
                    summary: 'Book considered brought due to high late fees',
                    value: {
                      message:
                        'Late fees of €19.00 exceed or equal book retail price. Book marked as brought.',
                      wallet: {
                        userId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
                        balance: 31.5,
                        createdAt: '2025-01-15T08:30:00.000Z',
                        updatedAt: '2025-04-01T15:35:22.345Z',
                      },
                    },
                  },
                },
              },
            },
          },
          '400': registry.refResponse('BadRequestError'),
          '401': registry.refResponse('UnauthorizedError'),
          '404': registry.refResponse('NotFoundError'),
        },
        security: [{ ApiTokenAuth: [] }],
      },
    },
  },
  components: {
    schemas: {
      Wallet: WalletSchema,
      BalanceWalletRequest: WalletBalanceRequestSchema,
      LateReturnRequest: LateReturnRequestSchema,
      User: UserSchema,
    },
  },
}
