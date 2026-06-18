import { Router } from 'express'
import healthRouter from './health.routes.js'

const appRouter = Router()

appRouter.get('/', (_req, res) => {
  res.send('Express + TypeScript Server is running perfectly!')
})

appRouter.use('/health', healthRouter)

export default appRouter
