import { readFileSync } from 'node:fs'

type PackageJson = {
  name: string
  version: string
}

// Le chemin est le même depuis `src/config/` et depuis `dist/config/` après build.
const packageJson = JSON.parse(
  readFileSync(new URL('../../package.json', import.meta.url), 'utf-8'),
) as PackageJson

const databaseUrl = process.env.DATABASE_URL

if (!databaseUrl) {
  throw new Error(
    "La variable d'environnement DATABASE_URL est absente. Voir .env.example.",
  )
}

const betterAuthSecret = process.env.BETTER_AUTH_SECRET

if (!betterAuthSecret) {
  throw new Error(
    "La variable d'environnement BETTER_AUTH_SECRET est absente. Voir .env.example.",
  )
}

const port = Number(process.env.PORT ?? 3000)

// Sans elle, Better Auth déduit l'origine de la requête entrante, ce qui
// devient faux derrière un proxy.
const betterAuthUrl = process.env.BETTER_AUTH_URL ?? `http://localhost:${port}`

// Une plage par défaut, parce que Vite bascule sur le port suivant quand le
// précédent est pris. La liste vit ici parce que le CORS et les
// `trustedOrigins` de Better Auth doivent rester d'accord : si les deux
// divergent, le navigateur attache bien le cookie mais Better Auth refuse la
// requête en amont.
//
// Surchargeable par l'environnement, sans quoi le premier déploiement casserait
// l'authentification sans autre recours qu'un changement de code.
const DEFAULT_FRONTEND_ORIGINS = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:5175',
  'http://localhost:5176',
]

const frontendOrigins = process.env.FRONTEND_ORIGINS
  ? process.env.FRONTEND_ORIGINS.split(',')
      .map((origin) => origin.trim())
      .filter(Boolean)
  : DEFAULT_FRONTEND_ORIGINS

export const appConfig = {
  port,
  name: packageJson.name,
  version: packageJson.version,
  databaseUrl,
  betterAuthSecret,
  betterAuthUrl,
  frontendOrigins,
}
