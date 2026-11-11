import type { Request, Response } from 'express'

import { toApiError } from '@/services/errors/apiErrors/apiErrors.js'
import { toSession } from '@/services/me/meService.js'

/** La session vient de `requireSession`, monté sur la route : la relire ici
 *  coûterait un second aller-retour en base pour la même information. Le `null`
 *  est traité quand même, pour ne pas supposer qu'un middleware a tourné. */
export const getMe = (_req: Request, res: Response) => {
  const session = toSession(res.locals.session ?? null)

  if (!session) {
    res.status(401).json(toApiError(null))

    return
  }

  res.json(session.user)
}
