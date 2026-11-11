import express from 'express'

import { authHandler } from '@/middlewares/authHandler/authHandler.js'
import { corsMiddleware } from '@/middlewares/corsMiddleware.js'
import { errorHandler } from '@/middlewares/errorHandler.js'
import { notFoundHandler } from '@/middlewares/notFoundHandler.js'
import { routes } from '@/routes/index.js'

export const app = express()

app.use(corsMiddleware)

// AVANT `express.json()` : le handler Better Auth lit le corps brut. Monté
// après, le flux serait déjà consommé et les POST resteraient en attente.
app.use('/api/auth', authHandler)

app.use(express.json())
app.use(routes)
app.use(notFoundHandler)
app.use(errorHandler)
