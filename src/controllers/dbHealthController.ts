import type { Request, Response } from 'express'

import { dbHealthRepository } from '@/repositories/dbHealthRepository.js'
import { getDbHealth } from '@/services/dbHealth/dbHealthService.js'

export const getDbHealthStatus = async (_req: Request, res: Response) => {
  const dbHealth = await getDbHealth(dbHealthRepository)

  res.status(dbHealth.status === 'ok' ? 200 : 503).json(dbHealth)
}
