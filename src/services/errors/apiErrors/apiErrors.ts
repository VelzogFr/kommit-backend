import { Prisma } from '@/generated/prisma/client.js'
import type { ApiError } from '@/types/apiContract.js'

/** Narrower sur cette forme plutôt que sur `instanceof APIError` permet à
 *  `authHandler` de passer le corps JSON d'une réponse d'erreur par ici. */
type ErrorWithBodyCode = { body: { code: string } }

const hasBodyCode = (error: unknown): error is ErrorWithBodyCode => {
  if (typeof error !== 'object' || error === null || !('body' in error)) {
    return false
  }

  const { body } = error as { body: unknown }

  return (
    typeof body === 'object' &&
    body !== null &&
    'code' in body &&
    typeof (body as { code: unknown }).code === 'string'
  )
}

/** Une liste blanche, pas un mapping par statut HTTP : `FAILED_TO_CREATE_SESSION`
 *  est un 400 comme les autres, et doit pourtant sortir en `INTERNAL_ERROR`. */
const BETTER_AUTH_CODES: Record<string, ApiError['code']> = {
  // Vérifié à la source (better-auth 1.7.2) : le code est bien celui-ci, et non
  // `USER_ALREADY_EXISTS` comme on pourrait le supposer.
  USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL: 'EMAIL_ALREADY_EXISTS',
  INVALID_EMAIL_OR_PASSWORD: 'INVALID_CREDENTIALS',
  // Filet : `authHandler` refuse déjà un email mal formé avant Better Auth, mais
  // si sa règle devient plus stricte que la nôtre, ce code sortirait en 500.
  INVALID_EMAIL: 'INVALID_CREDENTIALS',
}

const MESSAGES: Record<ApiError['code'], string> = {
  EMAIL_ALREADY_EXISTS: 'Un compte avec cet email existe déjà',
  INVALID_CREDENTIALS: 'Email ou mot de passe incorrect',
  STANDUP_NOT_FOUND: 'Ce standup est introuvable',
  LLM_QUOTA_EXCEEDED: 'Le service est momentanément saturé, réessaie plus tard',
  LLM_UNAVAILABLE: 'Le service est momentanément indisponible',
  SUMMARY_MALFORMED: 'Le résumé reçu est inexploitable',
  VALIDATION_ERROR: 'Les informations envoyées sont invalides',
  INTERNAL_ERROR: 'Une erreur interne est survenue, réessaie dans un instant',
}

/** Le seul endroit où un message d'erreur est écrit : l'appelant donne le code,
 *  le texte suit. */
export const apiError = (code: ApiError['code']): ApiError => ({
  code,
  message: MESSAGES[code],
})

/** Ce qu'on ne reconnaît pas sort en `INTERNAL_ERROR`, sans reprendre le message
 *  d'origine : celui d'une panne de base fait fuiter l'hôte et le port. */
export const toApiError = (error: unknown): ApiError => {
  if (hasBodyCode(error)) {
    const code = BETTER_AUTH_CODES[error.body.code]

    if (code) {
      return apiError(code)
    }
  }

  // Le second filet de RM9, quand deux signups simultanés passent sous le
  // contrôle applicatif et se font arbitrer par la contrainte `UNIQUE`.
  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2002'
  ) {
    return apiError('EMAIL_ALREADY_EXISTS')
  }

  return apiError('INTERNAL_ERROR')
}
