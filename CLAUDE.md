# kommit-backend

L'API du projet Kommit, en Node.js, Express et TypeScript.

## Arborescence

```
kommit-backend/
├── CLAUDE.md              # ce fichier
├── .claude/
│   ├── agents/            # les agents du workflow de ticket
│   ├── hooks/             # les scripts lancés par Claude Code (lint)
│   ├── rules/             # règles de code de l'équipe
│   ├── settings.json      # câblage des hooks
│   └── skills/            # les skills du workflow de ticket
├── .env.example           # les variables d'environnement à fournir
├── .vscode/
├── docs/
│   ├── TECH.md            # la stack technique du projet
│   ├── testing-strategy.md      # comment on trie et on écrit les tests
│   └── workflow-ticket-backend.md  # les 5 étapes d'un ticket
├── prisma/
│   ├── migrations/        # l'historique des migrations
│   └── schema.prisma      # le schéma de la base de données
├── src/
│   ├── index.ts           # démarrage du serveur
│   ├── app.ts             # assemblage de l'app Express
│   ├── config/            # configuration (app, instance Better Auth)
│   ├── middlewares/       # middlewares Express (CORS, auth, session, 404, erreurs)
│   ├── routes/            # déclaration des routes
│   ├── controllers/       # les handlers de routes
│   ├── services/          # la logique métier
│   ├── repositories/      # l'accès aux données
│   ├── types/             # le contrat d'API partagé avec le frontend
│   └── generated/         # le client Prisma généré (non commité)
├── testing/               # inventaires de tests et scénarios de smoke
├── eslint.config.js       # configuration du linter
├── package.json
├── prisma.config.ts       # configuration de la CLI Prisma
├── render.yaml            # le serveur backend de DEV sur Render (Blueprint)
├── tsconfig.json
└── vitest.config.ts       # configuration des tests unitaires
```

> **À maintenir :** cette arborescence doit être mise à jour à chaque fois que celle du repo change.
