import { Request, Response, NextFunction, RequestHandler } from 'express'
import jwt, { JwtPayload } from 'jsonwebtoken'

export interface ApiTokenOptions {
  /**
   * The JWT secret used to sign and verify tokens.
   */
  secret: string
  /**
   * The header to read the token from (defaults to 'Authorization').
   */
  headerName?: string
}

/**
 * API token authentication middleware.
 * Validates the JWT provided in the request header "Authorization" (or a custom header).
 * If valid, attaches the decoded token payload to req.user.
 */
export function apiTokenAuth(options: ApiTokenOptions): RequestHandler {
  const secret = options.secret
  const headerName = (options.headerName || 'Authorization').toLowerCase()

  return (req: Request, res: Response, next: NextFunction): void => {
    const authHeader = req.headers[headerName]

    if (!authHeader || typeof authHeader !== 'string') {
      res.status(401).json({ error: 'Missing API token' })
      return
    }

    // Expect header format: "Bearer <token>"
    const [scheme, token] = authHeader.split(' ')
    if (scheme !== 'Bearer' || !token) {
      res.status(401).json({ error: 'Invalid API token format' })
      return
    }

    try {
      const decoded = jwt.verify(token, secret) as JwtPayload
      // Attach decoded payload to request; adjust property name as needed.
      ;(req as any).user = decoded
      next()
    } catch (error) {
      res.status(401).json({ error: 'Invalid API token' })
    }
  }
}
