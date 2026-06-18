import express from 'express'
import appRouter from './routes/index.js'
import { errorHandler } from './middleware/error-handler.js'
import { requestLogger } from './middleware/logger.middleware.js'

const app = express()

app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))
app.use(requestLogger)
app.use(appRouter)
app.use(errorHandler)

export default app
