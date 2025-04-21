/**
 * @fileoverview This module provides a standardized error handling system for the application.
 * It includes a base ApplicationError class and utility functions for error creation and handling.
 */

import {
  ErrorCode,
  getDefaultMessageForError,
  getStatusCodeForError,
} from './errorCodes.js'
import { ErrorData } from './errors/ErrorData.js'
import { StatusCodes } from './errors/StatusCodes.js'

/**
 * Base error class for application-specific errors.
 * Extends the native Error class and adds status code and content handling.
 */
export class ApplicationError extends Error {
  /**
   * Creates a Bad Request (400) error
   * @param message - Custom error message, defaults to 'BAD REQUEST'
   * @param data - Optional error data
   * @returns ApplicationError instance
   */
  static BadRequest(
    message: string = 'BAD REQUEST',
    data?: ErrorData,
  ): ApplicationError {
    return new ApplicationError(StatusCodes.BAD_REQUEST, message, data)
  }

  /**
   * Creates a Conflict (409) error
   * @param message - Custom error message, defaults to 'CONFLICT'
   * @param data - Optional error data
   * @returns ApplicationError instance
   */
  static Conflict(
    message: string = 'CONFLICT',
    data?: ErrorData,
  ): ApplicationError {
    return new ApplicationError(StatusCodes.CONFLICT, message, data)
  }

  /**
   * Creates a Not Found (404) error
   * @param message - Custom error message, defaults to 'NOT FOUND'
   * @param data - Optional error data
   * @returns ApplicationError instance
   */
  static NotFound(
    message: string = 'NOT FOUND',
    data?: ErrorData,
  ): ApplicationError {
    return new ApplicationError(StatusCodes.NOT_FOUND, message, data)
  }

  /**
   * Creates an Unauthorized (401) error
   * @param message - Custom error message, defaults to 'UNAUTHORIZED'
   * @param data - Optional error data
   * @returns ApplicationError instance
   */
  static Unauthorized(
    message: string = 'UNAUTHORIZED',
    data?: ErrorData,
  ): ApplicationError {
    return new ApplicationError(StatusCodes.UNAUTHORIZED, message, data)
  }

  /**
   * Creates an Internal Server Error (500) error
   * @param message - Custom error message, defaults to 'INTERNAL SERVER ERROR'
   * @param data - Optional error data
   * @returns ApplicationError instance
   */
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

  /**
   * Creates a Not Implemented (501) error
   * @param message - Custom error message, defaults to 'NOT IMPLEMENTED'
   * @param data - Optional error data
   * @returns ApplicationError instance
   */
  static NotImplemented(
    message: string = 'NOT IMPLEMENTED',
    data?: ErrorData,
  ): ApplicationError {
    return new ApplicationError(StatusCodes.NOT_IMPLEMENTED, message, data)
  }

  /**
   * Creates a Precondition Failed (412) error
   * @param message - Custom error message, defaults to 'PRECONDITION FAILED'
   * @param data - Optional error data
   * @returns ApplicationError instance
   */
  static PreconditionFailed(
    message: string = 'PRECONDITION FAILED',
    data?: ErrorData,
  ): ApplicationError {
    return new ApplicationError(StatusCodes.PRECONDITION_FAILED, message, data)
  }

  /**
   * Creates a Request Timeout (408) error
   * @param message - Custom error message, defaults to 'REQUEST TIMEOUT'
   * @param data - Optional error data
   * @returns ApplicationError instance
   */
  static RequestTimeout(
    message: string = 'REQUEST TIMEOUT',
    data?: ErrorData,
  ): ApplicationError {
    return new ApplicationError(StatusCodes.REQUEST_TIMEOUT, message, data)
  }

  /**
   * Creates an Unprocessable Entity (422) error
   * @param message - Custom error message, defaults to 'UNPROCESSABLE ENTITY'
   * @param data - Optional error data
   * @returns ApplicationError instance
   */
  static UnprocessableEntity(
    message: string = 'UNPROCESSABLE ENTITY',
    data?: ErrorData,
  ): ApplicationError {
    return new ApplicationError(StatusCodes.UNPROCESSABLE_ENTITY, message, data)
  }

  /**
   * Creates a Forbidden (403) error
   * @param message - Custom error message, defaults to 'FORBIDDEN'
   * @param data - Optional error data
   * @returns ApplicationError instance
   */
  static Forbidden(
    message: string = 'FORBIDDEN',
    data?: ErrorData,
  ): ApplicationError {
    return new ApplicationError(StatusCodes.FORBIDDEN, message, data)
  }

  /**
   * Creates a Too Many Requests (429) error
   * @param message - Custom error message, defaults to 'TOO MANY REQUESTS'
   * @param data - Optional error data
   * @returns ApplicationError instance
   */
  static TooManyRequests(
    message: string = 'TOO MANY REQUESTS',
    data?: ErrorData,
  ): ApplicationError {
    return new ApplicationError(StatusCodes.TOO_MANY_REQUESTS, message, data)
  }

  /**
   * Creates a Gone (410) error
   * @param message - Custom error message, defaults to 'GONE'
   * @param data - Optional error data
   * @returns ApplicationError instance
   */
  static Gone(message: string = 'GONE', data?: ErrorData): ApplicationError {
    return new ApplicationError(StatusCodes.GONE, message, data)
  }

  /**
   * Type guard to check if an error is an ApplicationError
   * @param err - The error to check
   * @returns boolean indicating if the error is an ApplicationError
   */
  static isApplicationError(err: unknown): err is ApplicationError {
    return err instanceof ApplicationError
  }

  /** HTTP status code */
  status: number
  /** Error message */
  message: string
  /** Additional error data */
  content: any | ErrorData

  /**
   * Creates a new ApplicationError instance
   * @param statusCode - HTTP status code
   * @param message - Error message
   * @param content - Optional error data
   */
  constructor(
    public statusCode: number,
    message: string,
    content?: ErrorData | any,
  ) {
    super(message)

    this.status = statusCode
    this.message = message
    this.content = content
  }
}

/**
 * Creates a standardized application error
 * @param code - The error code from ErrorCode enum
 * @param message - Optional custom error message
 * @returns An ApplicationError instance with appropriate status code and message
 */
export function createError(
  code: ErrorCode,
  message?: string,
): ApplicationError {
  const statusCode = getStatusCodeForError(code)
  const errorMessage = message || getDefaultMessageForError(code)

  return new ApplicationError(statusCode, errorMessage)
}
