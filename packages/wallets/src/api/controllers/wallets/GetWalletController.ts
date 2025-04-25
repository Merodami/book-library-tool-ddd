import { schemas } from '@book-library-tool/api'
import {
  WalletSearchQuery,
  WalletSortField,
} from '@book-library-tool/api/src/schemas/wallets.js'
import { parseAndValidate } from '@book-library-tool/http'
import { Cache } from '@book-library-tool/redis'
import { WalletSortFieldEnum } from '@book-library-tool/sdk'
import { toApiWallet } from '@wallets/application/mappers/walletMapper.js'
import { GetWalletHandler } from '@wallets/application/use_cases/queries/GetWalletHandler.js'
import type { FastifyRequest } from 'fastify'

/**
 * Controller responsible for handling wallet retrieval operations.
 * This controller follows the CQRS pattern, specifically handling queries (read operations).
 * It uses Fastify's request/response types for type safety and better integration with Fastify.
 */
export class GetWalletController {
  /**
   * Creates a new instance of GetWalletController
   * @param getWalletHandler - The handler responsible for executing the wallet retrieval logic
   */
  constructor(private readonly getWalletHandler: GetWalletHandler) {}

  /**
   * Handles GET requests to retrieve a wallet by user ID
   * @param request - Fastify request object containing the user ID in params
   * @param reply - Fastify reply object for sending the response
   * @returns Promise<void> - The response is sent through the reply object
   *
   * @example
   * GET /wallets/123
   * Response: { id: "123", balance: 100, ... }
   */
  @Cache({
    ttl: parseInt(process.env.REDIS_DEFAULT_TTL || '3600', 10),
    prefix: 'wallet',
    condition: (result) => result !== null,
  })
  async getWallet(
    request: FastifyRequest<{ Params: { id: string } }>,
  ): Promise<schemas.WalletDTO> {
    const { id } = request.params

    const query = request.query as WalletSearchQuery

    let validFields: WalletSortField[] | null = null

    if (query.fields && typeof query.fields === 'string') {
      const allowed = Object.values(WalletSortFieldEnum)

      validFields = parseAndValidate<WalletSortField>(query.fields, allowed)
    }

    const result = await this.getWalletHandler.execute(
      { id },
      validFields ?? undefined,
    )

    return toApiWallet(result)
  }
}
