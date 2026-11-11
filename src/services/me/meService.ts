import type { AuthSession } from '@/config/auth.js'
import type { Session } from '@/types/apiContract.js'

/** Better Auth transporte bien plus que le contrat n'expose (dates, adresse IP,
 *  `emailVerified`) : ce qu'on n'envoie pas ne peut pas fuiter. */
export const toSession = (authSession: AuthSession): Session => {
  if (!authSession) {
    return null
  }

  const { id, name, email } = authSession.user

  return { user: { id, name, email } }
}
