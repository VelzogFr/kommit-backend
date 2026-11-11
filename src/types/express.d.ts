import type { AuthSession } from '@/config/auth.js'

// Le canal middleware → handler du repo, déjà posé par `architecture-backend.md`
// pour la validation d'entrée (`res.locals.body`). La session suit le même.
declare global {
  namespace Express {
    interface Locals {
      session?: AuthSession
    }
  }
}

export {}
