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
];
const STATUS_BY_CODE = {
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
export function statusForCode(code) {
    return STATUS_BY_CODE[code];
}
/** Thrown by route/service code; the global handler turns it into `ApiErrorBody`. */
export class ApiError extends Error {
    code;
    details;
    constructor(code, message, details) {
        super(message);
        this.name = 'ApiError';
        this.code = code;
        this.details = details;
    }
    static validation(message, details) {
        return new ApiError('VALIDATION_ERROR', message, details);
    }
    static unauthorized(message = 'Authentication required.') {
        return new ApiError('UNAUTHORIZED', message);
    }
    static notFound(message = 'Resource not found.') {
        return new ApiError('NOT_FOUND', message);
    }
    static notConfigured(message) {
        return new ApiError('NOT_CONFIGURED', message);
    }
}
export function toErrorBody(error) {
    const body = { error: { code: error.code, message: error.message } };
    if (error.details && Object.keys(error.details).length > 0) {
        body.error.details = error.details;
    }
    return body;
}
//# sourceMappingURL=errors.js.map