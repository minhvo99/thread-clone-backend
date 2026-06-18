import { Router } from 'express'
import { HealthController } from '../controllers/health.controller.js'
import { asyncHandler } from '../middleware/error-handler.js'
import { HealthService } from '../services/health.service.js'

const healthRouter = Router()
const healthService = new HealthService()
const healthController = new HealthController(healthService)

healthRouter.get('/', healthController.getHealth)
healthRouter.get('/db', asyncHandler(healthController.getDatabaseHealth))

export default healthRouter
