/**
 * The single documented API error shape.
 *
 * Stable codes are part of the public contract: the SPA switches on `code`, not
 * on `message`. Messages are human-facing and must never contain raw stderr,
 * stack traces, filesystem paths or credentials.
 */

export const ERROR_CODES = [
  'VALIDATION_ERROR',
  'UNAUTHORIZED',
  'FORBIDDEN',
  'NOT_FOUND',
  'RATE_LIMITED',
  'TIMEOUT',
  'UPSTREAM_ERROR',
  'NOT_CONFIGURED',
  'INTERNAL',
] as const;

export type ErrorCode = (typeof ERROR_CODES)[number];

/**
 * HTTP status per error code. `504` (TIMEOUT) is part of the union: it is
 * returned by `statusForCode` and must satisfy Hono's ContentfulStatusCode.
 */
export type ErrorStatus = 400 | 401 | 403 | 404 | 429 | 500 | 502 | 503 | 504;

const STATUS_BY_CODE: Record<ErrorCode, ErrorStatus> = {
  VALIDATION_ERROR: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  RATE_LIMITED: 429,
  TIMEOUT: 504,
  UPSTREAM_ERROR: 502,
  NOT_CONFIGURED: 503,
  INTERNAL: 500,
};

export function statusForCode(code: ErrorCode): ErrorStatus {
  return STATUS_BY_CODE[code];
}

export interface ApiErrorBody {
  error: {
    code: ErrorCode;
    message: string;
    details?: Record<string, unknown>;
  };
}

/** Thrown by route/service code; the global handler turns it into `ApiErrorBody`. */
export class ApiError extends Error {
  readonly code: ErrorCode;
  readonly details: Record<string, unknown> | undefined;

  constructor(code: ErrorCode, message: string, details?: Record<string, unknown>) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.details = details;
  }

  static validation(message: string, details?: Record<string, unknown>): ApiError {
    return new ApiError('VALIDATION_ERROR', message, details);
  }

  static unauthorized(message = 'Authentication required.'): ApiError {
    return new ApiError('UNAUTHORIZED', message);
  }

  static notFound(message = 'Resource not found.'): ApiError {
    return new ApiError('NOT_FOUND', message);
  }

  static notConfigured(message: string): ApiError {
    return new ApiError('NOT_CONFIGURED', message);
  }
}

export function toErrorBody(error: ApiError): ApiErrorBody {
  const body: ApiErrorBody = { error: { code: error.code, message: error.message } };
  if (error.details && Object.keys(error.details).length > 0) {
    body.error.details = error.details;
  }
  return body;
}