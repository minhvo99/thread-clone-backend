import type { ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';
import { ApiError, internalServerError, validationError } from '../lib/api-error.ts';

function normalizeError(err: unknown): ApiError {
  if (err instanceof ApiError) {
    return err;
  }

  if (err instanceof ZodError) {
    return validationError(
      'Invalid request input',
      err.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
      })),
    );
  }

  return internalServerError();
}

export const errorMiddleware: ErrorRequestHandler = (err, _req, res, _next) => {
  const apiError = normalizeError(err);

  res.status(apiError.statusCode).json({
    success: false,
    error: {
      code: apiError.code,
      message: apiError.message,
      ...(apiError.details ? { details: apiError.details } : {}),
    },
  });
};
