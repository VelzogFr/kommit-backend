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
 *  En ligne, front et back sont sur 2 domaines : le cookie doit sortir en
 *  `SameSite=None; Secure`, sinon le navigateur ne le renvoie pas. En local
 *  (http), on garde `Lax` : un navigateur rejette `SameSite=None` sans `Secure`.
 *  Vérifié dans better-auth 1.7.2 : `secure` suit déjà le protocole de
 *  `baseURL`, mais `sameSite` reste `lax` sans `defaultCookieAttributes`. */
const isServedOverHttps = appConfig.betterAuthUrl.startsWith('https://')

export const auth = betterAuth({
  database: prismaAdapter(prismaClient, { provider: 'postgresql' }),
  baseURL: appConfig.betterAuthUrl,
  secret: appConfig.betterAuthSecret,
  trustedOrigins: appConfig.frontendOrigins,
  advanced: isServedOverHttps
    ? { defaultCookieAttributes: { sameSite: 'none', secure: true } }
    : {},
  emailAndPassword: {
    enabled: true,
    // À garder aligné sur `signupSchema` et sur le message affiché au front.
    minPasswordLength: 8,
  },
})
