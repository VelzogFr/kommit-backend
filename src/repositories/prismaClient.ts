import { PrismaPg } from '@prisma/adapter-pg'

import { appConfig } from '@/config/appConfig.js'
import { PrismaClient } from '@/generated/prisma/client.js'

const adapter = new PrismaPg({ connectionString: appConfig.databaseUrl })

// La connexion est paresseuse : Prisma se connecte à la première requête.
// Le serveur démarre donc même si la base est injoignable, et c'est
// "/db-health" qui rapporte son état.
export const prismaClient = new PrismaClient({ adapter })
