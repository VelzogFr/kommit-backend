import type { Request, Response } from 'express'

import { getServiceInfo } from '@/services/root/rootService.js'

export const getRoot = (_req: Request, res: Response) => {
  res.json(getServiceInfo())
}
