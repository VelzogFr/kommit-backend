import { Router } from 'express'

import { getRoot } from '@/controllers/rootController.js'

export const rootRoutes = Router()

rootRoutes.get('/', getRoot)
