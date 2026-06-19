export type ApiErrorCode =
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'PAYLOAD_TOO_LARGE'
  | 'VALIDATION_ERROR'
  | 'UNPROCESSABLE_ENTITY'
  | 'BAD_GATEWAY'
  | 'INTERNAL_SERVER_ERROR';

export type ApiErrorDetail = {
  path?: string;
  message: string;
};

export class ApiError extends Error {
  readonly statusCode: number;
  readonly code: ApiErrorCode;
  readonly details?: ApiErrorDetail[];

  constructor(params: {
    statusCode: number;
    code: ApiErrorCode;
    message: string;
    details?: ApiErrorDetail[];
  }) {
    super(params.message);
    this.name = 'ApiError';
    this.statusCode = params.statusCode;
    this.code = params.code;
    this.details = params.details;
  }
}

export function unauthorized(message = 'Unauthorized'): ApiError {
  return new ApiError({ statusCode: 401, code: 'UNAUTHORIZED', message });
}

export function forbidden(message = 'Forbidden'): ApiError {
  return new ApiError({ statusCode: 403, code: 'FORBIDDEN', message });
}

export function notFound(message = 'Not found'): ApiError {
  return new ApiError({ statusCode: 404, code: 'NOT_FOUND', message });
}

export function conflict(message = 'Conflict'): ApiError {
  return new ApiError({ statusCode: 409, code: 'CONFLICT', message });
}

export function payloadTooLarge(message = 'Payload too large'): ApiError {
  return new ApiError({ statusCode: 413, code: 'PAYLOAD_TOO_LARGE', message });
}

export function validationError(
  message = 'Invalid request input',
  details?: ApiErrorDetail[],
): ApiError {
  return new ApiError({
    statusCode: 422,
    code: 'VALIDATION_ERROR',
    message,
    details,
  });
}

export function unprocessable(message = 'Unprocessable entity'): ApiError {
  return new ApiError({
    statusCode: 422,
    code: 'UNPROCESSABLE_ENTITY',
    message,
  });
}

export function badGateway(message = 'Bad gateway'): ApiError {
  return new ApiError({ statusCode: 502, code: 'BAD_GATEWAY', message });
}

export function internalServerError(message = 'Internal server error'): ApiError {
  return new ApiError({
    statusCode: 500,
    code: 'INTERNAL_SERVER_ERROR',
    message,
  });
}
