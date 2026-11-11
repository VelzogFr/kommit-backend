# Conventions de fichiers — backend

Comment on nomme un fichier, quand on le découpe, et où il vit avec son test.
Le découpage en couches est dans `architecture-backend.md`.

## Nommage des fichiers

**camelCase** partout, sans point ni tiret : `rootController.ts`, `errorHandler.ts`, `commitsRoutes.ts`, `commitsService.ts`. Pas de `root.controller.ts`, pas de `error-handler.ts`.

Le suffixe de couche dépend de la place du fichier dans sa couche : **fichier principal** ou **module**.

**Le fichier principal d'une couche porte le suffixe de sa couche** (`…Controller`, `…Routes`, `…Service`, `…Repository`). Il y en a un seul par domaine et par couche, et c'est justement celui qui entrerait en collision avec les autres couches du même domaine : `commitsController.ts`, `commitsRoutes.ts`, `commitsService.ts`, `commitsRepository.ts`. Le suffixe garde chaque onglet distinguable quand ils sont ouverts côte à côte (un onglet n'affiche que le nom du fichier, pas le dossier) ; sans lui, le service et le repository seraient tous les deux `commits.ts`.

**Un module à l'intérieur d'une couche est nommé par son rôle, sans suffixe de couche.** Quand un service est découpé en plusieurs fichiers, seul l'orchestrateur garde `…Service` ; les modules qu'il aspire prennent le nom de ce qu'ils font : `commitsValidation.ts`, `commitsFormat.ts`. Ils ne rentrent en collision avec personne, donc pas besoin du suffixe.

## Quand découper un fichier en modules

Le nommage dit **comment** appeler un module, mais pas **quand** en créer un. La règle : **un fichier, une responsabilité**. Dès qu'un fichier de couche mêle plusieurs responsabilités indépendantes (pour un service, par exemple : la validation d'entrée, le mapping vers un format externe, la persistance, un calcul métier), on le découpe en modules, un par responsabilité, et l'orchestrateur garde le suffixe de couche.

Le signal concret : **si on ressent le besoin de tracer des bandeaux de commentaires pour séparer des sections d'un fichier, c'est que ces sections veulent devenir des modules.** Le commentaire de section compense un découpage manquant.

Calibrage, pour ne pas créer le défaut inverse : on découpe par responsabilité **réellement indépendante**, pas mécaniquement. Un fichier par fonction est un smell autant qu'un fichier qui fait tout. Deux morceaux qui changent toujours ensemble et ne se comprennent qu'ensemble restent dans le même fichier.

## Où vit un fichier et son test

Le nommage ci-dessus dit **comment** s'appelle un fichier ; reste **où** il vit. Dès qu'un fichier de prod a un test, les deux vivent ensemble dans un dossier au nom du fichier qu'ils couvrent. Ça vaut à toutes les couches et pour les modules d'un service.

Un module **sans** test propre reste à plat dans le dossier du domaine : on ne crée un dossier que pour une **paire**. Dans `services/commits/`, l'orchestrateur et le module testés ont chacun leur dossier, les modules couverts indirectement par `commitsService.test.ts` restent à plat :

```
services/commits/
├── commitsService/          # l'orchestrateur + son test
│   ├── commitsService.ts
│   └── commitsService.test.ts
├── commitsFormat/           # un module + son test
│   ├── commitsFormat.ts
│   └── commitsFormat.test.ts
└── commitsValidation.ts     # module sans test propre → à plat
```
