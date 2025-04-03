import { ErrorData } from './errors/ErrorData.js'
import { StatusCodes } from './errors/StatusCodes.js'

export class ApplicationError extends Error {
  static BadRequest(
    message: string = 'BAD REQUEST',
    data?: ErrorData,
  ): ApplicationError {
    return new ApplicationError(StatusCodes.BAD_REQUEST, message, data)
  }

  static Conflict(
    message: string = 'CONFLICT',
    data?: ErrorData,
  ): ApplicationError {
    return new ApplicationError(StatusCodes.CONFLICT, message, data)
  }

  static NotFound(
    message: string = 'NOT FOUND',
    data?: ErrorData,
  ): ApplicationError {
    return new ApplicationError(StatusCodes.NOT_FOUND, message, data)
  }

  static Unauthorized(
    message: string = 'UNAUTHORIZED',
    data?: ErrorData,
  ): ApplicationError {
    return new ApplicationError(StatusCodes.UNAUTHORIZED, message, data)
  }

  static InternalServerError(
    message: string = 'INTERNAL SERVER ERROR',
    data?: ErrorData,
  ): ApplicationError {
    return new ApplicationError(
      StatusCodes.INTERNAL_SERVER_ERROR,
      message,
      data,
    )
  }

  static NotImplemented(
    message: string = 'NOT IMPLEMENTED',
    data?: ErrorData,
  ): ApplicationError {
    return new ApplicationError(StatusCodes.NOT_IMPLEMENTED, message, data)
  }

  static PreconditionFailed(
    message: string = 'PRECONDITION FAILED',
    data?: ErrorData,
  ): ApplicationError {
    return new ApplicationError(StatusCodes.PRECONDITION_FAILED, message, data)
  }

  static RequestTimeout(
    message: string = 'REQUEST TIMEOUT',
    data?: ErrorData,
  ): ApplicationError {
    return new ApplicationError(StatusCodes.REQUEST_TIMEOUT, message, data)
  }

  static UnprocessableEntity(
    message: string = 'UNPROCESSABLE ENTITY',
    data?: ErrorData,
  ): ApplicationError {
    return new ApplicationError(StatusCodes.UNPROCESSABLE_ENTITY, message, data)
  }

  static Forbidden(
    message: string = 'FORBIDDEN',
    data?: ErrorData,
  ): ApplicationError {
    return new ApplicationError(StatusCodes.FORBIDDEN, message, data)
  }

  static TooManyRequests(
    message: string = 'TOO MANY REQUESTS',
    data?: ErrorData,
  ): ApplicationError {
    return new ApplicationError(StatusCodes.TOO_MANY_REQUESTS, message, data)
  }

  static Gone(message: string = 'GONE', data?: ErrorData): ApplicationError {
    return new ApplicationError(StatusCodes.GONE, message, data)
  }

  static isApplicationError(err: unknown): err is ApplicationError {
    return err instanceof ApplicationError
  }

  status: number
  message: string
  content: any | ErrorData

  constructor(
    public statusCode: number,
    message: string,
    content?: ErrorData | any,
  ) {
    super(message)

    this.status = statusCode
    this.message = message
    this.content = {
      ...content,
    }
  }
}

export const catchError =
  (entityType: string, entityId: string) => (err: Error) => {
    // TypeORM error "EntityNotFound"
    if (err.name === 'EntityNotFound') {
      throw new ApplicationError(404, `Unknown ${entityType} "${entityId}"`)
    } else {
      throw err
    }
  }
