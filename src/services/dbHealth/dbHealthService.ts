export type DbHealthRepository = {
  ping: () => Promise<void>
}

export type DbHealth =
  | { status: 'ok'; latency: number }
  | { status: 'unreachable' }

// Au-delà de ce délai, la base est considérée injoignable. Sans lui, une base
// qui absorbe les paquets sans répondre laisserait la route pendre au lieu de
// renvoyer un 503 : le pilote PostgreSQL n'impose plus de timeout de connexion.
const PING_TIMEOUT_MS = 5_000

const rejectAfter = (ms: number) =>
  new Promise<never>((_, reject) => {
    setTimeout(
      () => reject(new Error(`La base n'a pas répondu en ${ms} ms.`)),
      ms,
    ).unref()
  })

export const getDbHealth = async (
  repository: DbHealthRepository,
): Promise<DbHealth> => {
  const start = performance.now()

  try {
    await Promise.race([repository.ping(), rejectAfter(PING_TIMEOUT_MS)])
  } catch (error) {
    console.error('La base de données est injoignable :', error)

    return { status: 'unreachable' }
  }

  return { status: 'ok', latency: Math.round(performance.now() - start) }
}
