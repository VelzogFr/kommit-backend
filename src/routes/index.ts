import { Router } from 'express'

import { dbHealthRoutes } from '@/routes/dbHealthRoutes.js'
import { healthRoutes } from '@/routes/healthRoutes.js'
import { meRoutes } from '@/routes/meRoutes.js'
import { rootRoutes } from '@/routes/rootRoutes.js'

export const routes = Router()

routes.use('/', rootRoutes)
routes.use('/health', healthRoutes)
routes.use('/db-health', dbHealthRoutes)
routes.use('/me', meRoutes)
