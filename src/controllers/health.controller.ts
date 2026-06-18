import { type Request, type Response } from 'express'
import { HealthService } from '../services/health.service.js'

export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  getHealth = (_req: Request, res: Response): void => {
    res.json({ ok: true })
  }

  getDatabaseHealth = async (_req: Request, res: Response): Promise<void> => {
    const result = await this.healthService.checkDatabase()
    res.json(result)
  }
}
