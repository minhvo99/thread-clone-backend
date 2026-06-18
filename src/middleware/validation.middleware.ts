import { type NextFunction, type Request, type Response } from 'express'
import { ZodError, type ZodType } from 'zod'
import { ValidationError } from '../utils/errors'

export const validate = (schema: ZodType) => {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsed = (await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
      })) as {
        body: Request['body']
        query: Request['query']
        params: Request['params']
      }

      req.body = parsed.body
      req.query = parsed.query
      req.params = parsed.params
      next()
    } catch (error) {
      if (error instanceof ZodError) {
        next(
          new ValidationError(
            'Validation failed',
            error.issues.map((issue) => ({
              field: issue.path.join('.'),
              message: issue.message,
            })),
          ),
        )
        return
      }

      next(error)
    }
  }
}
