import { Router } from 'express'

import { getMe } from '@/controllers/meController.js'
import { requireSession } from '@/middlewares/requireSession/requireSession.js'

export const meRoutes = Router()

// Le patron que F2 recopiera sur `GET /standups`.
meRoutes.get('/', requireSession, getMe)
