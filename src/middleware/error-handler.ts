import { type NextFunction, type Request, type Response } from 'express';
import { ZodError } from 'zod';
import { appConfig } from '../config/app.config';
import { AppError, ValidationError } from '../utils/errors';

export const errorHandler = (
    err: Error,
    req: Request,
    res: Response,
    _next: NextFunction,
): void => {
    if (err instanceof ZodError) {
        res.status(400).json({
            status: 'error',
            message: 'Validation failed',
            errors: err.issues.map((issue) => ({
                field: issue.path.join('.'),
                message: issue.message,
            })),
        });
        return;
    }

    if (err instanceof AppError) {
        res.status(err.statusCode).json({
            status: 'error',
            message: err.message,
            ...(err instanceof ValidationError && err.errors ?
                { errors: err.errors }
            :   {}),
        });
        return;
    }

    console.error('Unhandled error', {
        message: err.message,
        stack: err.stack,
        method: req.method,
        url: req.url,
    });

    const message =
        appConfig.nodeEnv === 'production' ?
            'Internal server error'
        :   err.message;

    res.status(500).json({
        status: 'error',
        message,
    });
};

export const asyncHandler =
    <TRequest extends Request = Request>(
        fn: (
            req: TRequest,
            res: Response,
            next: NextFunction,
        ) => Promise<unknown>,
    ) =>
    (req: Request, res: Response, next: NextFunction): void => {
        Promise.resolve(fn(req as TRequest, res, next)).catch(next);
    };
