import type { NextFunction, Request, Response } from 'express'

import { toApiError } from '@/services/errors/apiErrors/apiErrors.js'

/** Le dernier filet des routes hors authentification : `authHandler` traite
 *  celles-là avant. La trace reste dans les logs, le client n'a que
 *  l'`ApiError`. */
export const errorHandler = (
  error: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
) => {
  console.error(error)

  res.status(500).json(toApiError(error))
}
