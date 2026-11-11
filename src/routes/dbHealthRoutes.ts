import { Router } from 'express'

import { getDbHealthStatus } from '@/controllers/dbHealthController.js'

export const dbHealthRoutes = Router()

dbHealthRoutes.get('/', getDbHealthStatus)
