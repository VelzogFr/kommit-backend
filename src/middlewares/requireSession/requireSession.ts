import type { NextFunction, Request, Response } from 'express'
import { fromNodeHeaders } from 'better-auth/node'
import { auth } from '@/config/auth.js'
import { toApiError } from '@/services/errors/apiErrors/apiErrors.js'

/** Refuse en 401 toute requête sans session valide (RM2). C'est ce qui
 *  permettra à F2 de scoper `GET /standups` par utilisateur.
 *
 *  La session est déposée dans `res.locals` pour que le handler la lise sans
 *  refaire la requête. */
export const requireSession = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const session = await auth.api.getSession({
    headers: fromNodeHeaders(req.headers),
  })

  if (!session) {
    // Le contrat n'a pas de code pour « pas de session » : le front la traite
    // par une redirection, pas par un message. D'où `INTERNAL_ERROR`, plutôt
    // que d'élargir un fichier partagé pour ce seul cas.
    res.status(401).json(toApiError(null))

    return
  }

  res.locals.session = session

  next()
}
