import compression from 'compression'
import cors from 'cors'
import express from 'express'
import helmet from 'helmet'
import appRouter from './routes/index.js'
import { errorHandler } from './middleware/error-handler.js'
import { requestLogger } from './middleware/logger.middleware.js'

const app = express()

app.use(helmet())
app.use(
  cors({
    origin: process.env.ALLOWED_ORIGINS?.split(',').map((value) => value.trim()) || true,
  }),
)
app.use(compression())
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))
app.use(requestLogger)
app.use(appRouter)
app.use(errorHandler)

export default app
