import cors from 'cors'

import { appConfig } from '@/config/appConfig.js'

// Une origin absente de la liste ne reçoit pas les en-têtes CORS : c'est le
// navigateur qui bloque, pas le serveur.
export const corsMiddleware = cors({
  origin: appConfig.frontendOrigins,
  // Sans ça le navigateur n'attache pas le cookie de session en cross-origin,
  // et la requête suivante arrive sans session (RM8, RM12). Le front doit de
  // son côté envoyer ses requêtes avec `credentials: 'include'`.
  credentials: true,
})
