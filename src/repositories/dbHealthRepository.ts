import type { DbHealthRepository } from '@/services/dbHealth/dbHealthService.js'

import { prismaClient } from '@/repositories/prismaClient.js'

export const dbHealthRepository: DbHealthRepository = {
  ping: async () => {
    await prismaClient.$queryRaw`SELECT 1`
  },
}
