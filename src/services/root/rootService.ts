import { appConfig } from '@/config/appConfig.js'

type Endpoint = {
  method: string
  path: string
  description: string
}

export type ServiceInfo = {
  name: string
  version: string
  endpoints: Endpoint[]
}

const endpoints: Endpoint[] = [
  {
    method: 'GET',
    path: '/',
    description: "Documentation d'entrée de l'API : nom du service, version et endpoints exposés.",
  },
  {
    method: 'GET',
    path: '/health',
    description: "État du process : statut, uptime et timestamp.",
  },
  {
    method: 'GET',
    path: '/db-health',
    description: "État de la base de données : statut et latence.",
  },
  {
    method: 'GET',
    path: '/me',
    description: "L'utilisateur de la session courante. Répond 401 sans session.",
  },
  {
    method: 'ALL',
    path: '/api/auth/*',
    description:
      "Authentification, fournie par Better Auth : /sign-up/email, /sign-in/email, /sign-out et /get-session.",
  },
]

export const getServiceInfo = (): ServiceInfo => ({
  name: appConfig.name,
  version: appConfig.version,
  endpoints,
})
