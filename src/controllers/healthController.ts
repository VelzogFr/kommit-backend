import type { Request, Response } from 'express'

import { getProcessHealth } from '@/services/health/healthService.js'

export const getHealth = (_req: Request, res: Response) => {
  res.json(getProcessHealth())
}
