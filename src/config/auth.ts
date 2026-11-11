import { betterAuth } from 'better-auth'
import { prismaAdapter } from 'better-auth/adapters/prisma'

import { appConfig } from '@/config/appConfig.js'
import { prismaClient } from '@/repositories/prismaClient.js'

/** `null` quand aucun cookie de session valide n'accompagne la requête. */
export type AuthSession = {
  session: { id: string; userId: string }
  user: { id: string; name: string; email: string }
} | null

/** L'instance seule : le ré-emballage des erreurs vit dans `authHandler`.
 *
 *  Sans l'origine du front dans `trustedOrigins`, Better Auth refuse la requête
 *  avant d'arriver à l'authentification, même cookie joint.
 *
 *  Le cookie garde le `SameSite=Lax` par défaut, qui suffit tant que le front
 *  et le back sont tous les deux sur `localhost`. Il passera à
 *  `SameSite=None; Secure` sur deux domaines réellement différents. */
export const auth = betterAuth({
  database: prismaAdapter(prismaClient, { provider: 'postgresql' }),
  baseURL: appConfig.betterAuthUrl,
  secret: appConfig.betterAuthSecret,
  trustedOrigins: appConfig.frontendOrigins,
  emailAndPassword: {
    enabled: true,
    // À garder aligné sur `signupSchema` et sur le message affiché au front.
    minPasswordLength: 8,
  },
})
