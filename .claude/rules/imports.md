# Imports — backend

Le projet est en ESM (`"type": "module"`, `moduleResolution: NodeNext`) et utilise l'alias `@/` qui pointe sur `src/`.

## La règle

**Les imports internes passent par `@/`, jamais par `./` ni `../`**, et gardent l'extension `.js` (NodeNext l'exige), même si le fichier source est un `.ts`.

```ts
import { getRoot } from '@/controllers/rootController.js'
```

Les imports de paquets externes (`express`, `zod`…) restent des specifiers nus, sans alias ni extension.

## Où l'alias est câblé

Il tient à **quatre endroits**, et un seul oublié casse un des modes d'exécution sans casser les autres :

- `paths` dans `tsconfig.json`, pour le typecheck ;
- `tsx`, qui le résout en développement ;
- `vite-tsconfig-paths`, pour Vitest ;
- `tsc-alias`, qui réécrit `@/` en relatif dans `dist/` au build (`tsc` ne le fait pas seul).

Le piège : poser seulement `paths` fait passer le typecheck, puis l'app casse au premier lancement, ou les tests au premier import. Quand un import en `@/` ne résout pas, vérifier lequel des quatre manque avant de retomber sur un chemin relatif.
