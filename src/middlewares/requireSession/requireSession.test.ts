import type { NextFunction, Request, Response } from 'express'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// `vi.mock` est hoisté au-dessus des imports : le mock de `getSession` passe par
// `vi.hoisted` pour être défini au moment où la factory s'exécute.
const { getSessionMock } = vi.hoisted(() => ({ getSessionMock: vi.fn() }))

vi.mock('@/config/auth.js', () => ({
  auth: { api: { getSession: getSessionMock } },
}))

import { requireSession } from '@/middlewares/requireSession/requireSession.js'

// Forme relevée à la source (better-auth 1.7.2, `dist/api/routes/session.mjs`) :
// `getSession` renvoie `null` quand la requête n'a pas de cookie de session
// valide, sinon un objet `{ session, user }`.
const openSession = {
  session: { id: 'session-1', userId: 'user-1' },
  user: { id: 'user-1', name: 'Marc', email: 'marc@x.com' },
}

const createRequest = (headers: Record<string, string>) =>
  ({ headers }) as unknown as Request

const createResponse = () => {
  const response = {
    sentStatus: null as number | null,
    sentBody: null as unknown,
    locals: {} as Record<string, unknown>,
    status(status: number) {
      response.sentStatus = status
      return response
    },
    json(body: unknown) {
      response.sentBody = body
      return response
    },
  }

  return response
}

const asExpressResponse = (response: ReturnType<typeof createResponse>) =>
  response as unknown as Response

beforeEach(() => {
  getSessionMock.mockReset()
})

describe('4. Gestion des erreurs et pannes', () => {
  describe('RM2 — route protégée sans session, 401', () => {
    it('répond 401 et n\'appelle pas la suite de la chaîne quand il n\'y a pas de session', async () => {
      getSessionMock.mockResolvedValue(null)
      const requestWithoutSessionCookie = createRequest({})
      const responseWithoutSession = createResponse()
      const next: NextFunction = vi.fn()

      await requireSession(
        requestWithoutSessionCookie,
        asExpressResponse(responseWithoutSession),
        next,
      )

      expect(responseWithoutSession.sentStatus).toBe(401)
      expect(next).not.toHaveBeenCalled()
    })

    it('répond 401 quand le cookie de session est présent mais invalide', async () => {
      getSessionMock.mockResolvedValue(null)
      const requestWithExpiredCookie = createRequest({
        cookie: 'better-auth.session_token=perime',
      })
      const responseWithExpiredCookie = createResponse()
      const next: NextFunction = vi.fn()

      await requireSession(
        requestWithExpiredCookie,
        asExpressResponse(responseWithExpiredCookie),
        next,
      )

      expect(responseWithExpiredCookie.sentStatus).toBe(401)
    })

    it('laisse passer la requête quand une session existe', async () => {
      getSessionMock.mockResolvedValue(openSession)
      const requestWithSessionCookie = createRequest({
        cookie: 'better-auth.session_token=valide',
      })
      const responseWithSession = createResponse()
      const next: NextFunction = vi.fn()

      await requireSession(
        requestWithSessionCookie,
        asExpressResponse(responseWithSession),
        next,
      )

      expect(next).toHaveBeenCalledTimes(1)
      expect(responseWithSession.sentStatus).toBeNull()
      expect(responseWithSession.locals['session']).toBe(openSession)
    })
  })
})
