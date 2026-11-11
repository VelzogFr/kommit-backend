import { toNodeHandler } from 'better-auth/node'
import type { z } from 'zod'

import { auth } from '@/config/auth.js'
import { apiError, toApiError } from '@/services/errors/apiErrors/apiErrors.js'
import {
  signinSchema,
  signupSchema,
} from '@/services/auth/authValidation/authValidation.js'
import type { ApiError } from '@/types/apiContract.js'

/** Les routes dont le corps passe par un schéma avant Better Auth, avec le refus
 *  renvoyé quand il ne passe pas. Au signin, un email mal formé est un
 *  identifiant qui ne correspond à aucun compte (RM13, RM20). */
const VALIDATED_ROUTES: {
  path: string
  schema: z.ZodType
  refusal: { code: ApiError['code']; status: number }
}[] = [
  {
    path: '/sign-up/email',
    schema: signupSchema,
    refusal: { code: 'VALIDATION_ERROR', status: 400 },
  },
  {
    path: '/sign-in/email',
    schema: signinSchema,
    refusal: { code: 'INVALID_CREDENTIALS', status: 401 },
  },
]

/** Normalise l'email avant que Better Auth ne le voie. Sans ça, ` MARC@x.com `
 *  part tel quel : Better Auth le juge mal formé et refuse pour la mauvaise
 *  raison, au lieu de buter sur le compte `marc@x.com` déjà en base (RM21).
 *
 *  La requête est reconstruite parce qu'un `Request` est immuable. */
const withValidatedBody = async (
  request: Request,
  schema: z.ZodType,
): Promise<Request | null> => {
  const body: unknown = await request.json().catch(() => null)
  const parsed = schema.safeParse(body)

  if (!parsed.success) {
    return null
  }

  return new Request(request.url, {
    method: request.method,
    headers: request.headers,
    body: JSON.stringify(parsed.data),
  })
}

/** Le handler Better Auth, enveloppé pour que rien de brut ne sorte.
 *
 *  On intercepte la RÉPONSE, pas une exception : sur un email déjà pris, Better
 *  Auth ne lève rien, il écrit lui-même son 422. Un `try/catch` autour du
 *  handler ne verrait donc jamais ce cas, et `onAPIError: { throw: true }` n'y
 *  change rien, la réponse part quand même. Le `catch` ne couvre que le reste :
 *  une panne de base, un timeout. */
export const handleWithApiErrors = async (request: Request): Promise<Response> => {
  try {
    let handledRequest = request

    const { pathname } = new URL(request.url)
    const validatedRoute =
      request.method === 'POST'
        ? VALIDATED_ROUTES.find(({ path }) => pathname.endsWith(path))
        : undefined

    if (validatedRoute) {
      const validated = await withValidatedBody(request, validatedRoute.schema)

      if (!validated) {
        const { code, status } = validatedRoute.refusal

        return Response.json(apiError(code), { status })
      }

      handledRequest = validated
    }

    const response = await auth.handler(handledRequest)

    // Le succès porte le `Set-Cookie` de session : le toucher casserait la
    // connexion automatique après le signup.
    if (response.ok) {
      return response
    }

    // Emballé sous `body` pour retrouver la forme d'une `APIError` levée, la
    // seule que `toApiError` sait lire.
    const body: unknown = await response.json().catch(() => null)
    const translatedError = toApiError({ body })

    // Une erreur qu'on n'a pas su traduire n'est pas la faute du client : la
    // renvoyer en 4xx lui demanderait de corriger sa requête, alors qu'on lui
    // annonce une panne. Elle sort donc en 500, comme celles que le `catch`
    // rattrape, et les erreurs métier gardent leur statut d'origine (RM9).
    //
    // On logue au même endroit, parce que c'est ici que le code et le message
    // anglais d'origine disparaissent : sans ça la panne est indiagnosticable.
    if (translatedError.code === 'INTERNAL_ERROR') {
      console.error('Erreur Better Auth non reconnue', response.status, body)

      return Response.json(translatedError, { status: 500 })
    }

    return Response.json(translatedError, {
      status: response.status,
      headers: response.headers,
    })
  } catch (error) {
    console.error(error)

    return Response.json(toApiError(error), { status: 500 })
  }
}

export const authHandler = toNodeHandler(handleWithApiErrors)
