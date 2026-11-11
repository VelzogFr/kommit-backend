# Gestionnaire de paquets — pnpm

Sur ce repo, le gestionnaire de paquets est **pnpm**, tout le temps, sans exception.

- Installer : `pnpm install` (jamais `npm install` ni `yarn`)
- Ajouter une dépendance : `pnpm add <pkg>` (`pnpm add -D <pkg>` pour une dépendance de dev)
- Supprimer : `pnpm remove <pkg>`
- Lancer un script : `pnpm <script>` (ex. `pnpm dev`, `pnpm build`, `pnpm typecheck`)
- Exécuter un binaire ponctuel : `pnpm dlx <pkg>` (jamais `npx`)

Ne jamais créer ni modifier `package-lock.json` ou `yarn.lock` : le seul lockfile est `pnpm-lock.yaml`.

Dans toute commande, doc ou exemple généré pour ce repo, écrire `pnpm` — même si la doc de l'outil montre `npm`.
