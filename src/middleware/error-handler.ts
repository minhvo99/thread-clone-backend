import { type NextFunction, type Request, type Response } from 'express'
import { AppError } from '../utils/errors.js'

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction,
): void => {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      status: 'error',
      message: err.message,
    })
    return
  }

  console.error('Unhandled error', {
    message: err.message,
    stack: err.stack,
    method: req.method,
    url: req.url,
  })

  const message =
    process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message

  res.status(500).json({
    status: 'error',
    message,
  })
}

export const asyncHandler =
  (
    fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>,
  ) =>
  (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next)
  }
