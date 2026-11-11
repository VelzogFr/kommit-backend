import type { Request, Response } from 'express'

import type { ApiError } from '@/types/apiContract.js'

/** `INTERNAL_ERROR` faute de mieux : le contrat ne fige que les erreurs qu'on
 *  affiche à l'utilisateur, et une URL inexistante est un bug de
 *  développement. */
export const notFoundHandler = (req: Request, res: Response) => {
  const notFound: ApiError = {
    code: 'INTERNAL_ERROR',
    message: `Route introuvable : ${req.method} ${req.originalUrl}`,
  }

  res.status(404).json(notFound)
}
