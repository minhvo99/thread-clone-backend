import { type NextFunction, type Request, type Response } from 'express';

export const requestLogger = (
    req: Request,
    res: Response,
    next: NextFunction,
): void => {
    const start = Date.now();

    res.on('finish', () => {
        const duration = Date.now() - start;

        console.log(
            JSON.stringify({
                method: req.method,
                url: req.originalUrl,
                status: res.statusCode,
                duration: `${duration}ms`,
            }),
        );
    });

    next();
};
