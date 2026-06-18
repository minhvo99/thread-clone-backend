import { Router } from 'express'
import authRouter from './auth.routes'
import { prisma } from '../config/database'

const appRouter = Router()

appRouter.get('/', (_req, res) => {
  res.send('Express + TypeScript Server is running perfectly!')
})

appRouter.use('/auth', authRouter)
appRouter.get('/health', (_req, res) => {
  res.json({ ok: true })
})

appRouter.get('/health/db', async (_req, res) => {
  await prisma.$queryRaw`SELECT 1`
  res.json({ ok: true, database: 'connected' })
})

export default appRouter
