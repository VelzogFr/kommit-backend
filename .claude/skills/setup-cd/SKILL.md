---
name: setup-cd
description: Met en place le déploiement continu du serveur backend de DEV sur Render, jusqu'à un serveur qui répond. Utiliser quand l'utilisateur dit "setup-cd", "branche Render", "mets en place la CD", "déploiement continu".
---

## Entrée

- Le **repo courant**, comprenant :
  - `package.json`, pour ses scripts `build` et `start` ;
  - `.nvmrc`, pour la version de Node ;
  - `.env.example`, pour le nom exact de chaque variable.
- Optionnel : un **ticket de CD** (lien ou ID Notion). S'il est donné, le skill suit ses règles métier.

## Sortie

- Un fichier de config **`render.yaml`** à la racine du repo, déclarant le serveur backend de DEV.
- L'**URL publique du serveur backend de DEV**, déployé chez Render (ex : `https://<nom-du-serveur>.onrender.com`).
- Chaque merge vers la branche cible (ex : `dev`) déclenche un nouveau déploiement automatique chez Render.
- Chaque déploiement est confirmé par une réponse sur la **route `/health`**.

---

## Accompagner l'utilisateur jusqu'au bout

Le skill ne lâche pas l'utilisateur avant la fin du ticket.

1. **Au démarrage, une tâche par étape** avec `TaskCreate`, sans tâche pour les règles métier du ticket. Chaque tâche passe en `in_progress` quand on l'attaque, et en `completed` seulement après vérification.
2. **Une étape à la fois** : annoncer l'étape, ce qu'elle sert à obtenir, et ce que l'utilisateur doit faire.
3. **Chaque étape manuelle se termine par une question** (« C'est fait ? ») : ne pas passer à la suite sans réponse.
4. **Vérifier soi-même quand c'est possible** : ne pas se contenter du « oui » de l'utilisateur (ex. après la saisie des secrets, vérifier que le déploiement repart et que l'app répond).
5. **Ne rendre la main qu'à la fin du ticket** : quand toutes les RM sont vérifiées, ou bloquées avec une raison claire.

## Étapes

1. **Détecter le contexte.** Scripts `build` / `start` du `package.json`, version du `.nvmrc` (Render la lit). **Les variables d'environnement : lire `.env.example`**, qui donne le nom exact de chaque variable que le code lit. Ne jamais supposer un nom : il change d'un repo à l'autre. Vérifier aussi les variables exigées au build (ex. un `prisma.config.ts` qui fait `throw` si une variable manque).

   **Les origines autorisées doivent venir d'une variable d'environnement.** Chercher dans le code où elles sont déclarées : la config CORS, et les origines de confiance de la librairie d'authentification (ex. `trustedOrigins` de Better Auth). Si elles sont écrites en dur (ex. `http://localhost:5173` dans le code), s'arrêter avant d'écrire `render.yaml` et proposer à l'utilisateur de les passer dans une variable d'environnement : le code la lit, garde `localhost` par défaut, et la variable est ajoutée à `.env.example`. Cette modification suit le chemin normal (commit, PR, merge vers `dev`). Sans elle, le frontend en ligne ne pourra jamais appeler le backend : son URL n'est pas dans les origines autorisées. Ne pas écrire dans `.env` : en local, le code utilise la valeur par défaut (`localhost`), et en ligne, la valeur vient de `render.yaml`.

2. **Faire valider chaque variable non secrète, avant d'écrire.** Pour chaque variable de `.env.example` qui n'est pas un secret (ex. `<ORIGINES_AUTORISÉES>`), poser une question `AskUserQuestion`, même si une valeur a été trouvée, pour que l'utilisateur sache de quoi il est question. La question suit ce format :
   1. ce dont le skill a besoin, et à quoi ça sert, en 1 phrase (ex. « J'ai besoin de `<ORIGINES_AUTORISÉES>` : ce sont les sites qui ont le droit d'appeler ton backend. ») ;
   2. la valeur trouvée, et où (ex. « J'ai trouvé `http://localhost:5173` dans `.env.example` »), ou une valeur proposée si rien n'est trouvé ;
   3. « Je l'utilise ? », avec en options la valeur trouvée ou proposée, et une saisie libre. Le libellé de chaque option est la valeur complète (ex. l'URL entière), pas un raccourci. Si la valeur trouvée ne convient pas en ligne (ex. une URL `localhost`), le dire et recommander la valeur proposée.

   **Avant les variables, le nom du serveur sur Render, dans un formulaire à part.** Le poser seul, et attendre la réponse avant de poser les questions des variables : celles-ci affichent alors les vraies valeurs déduites du nom (ex. l'URL complète), jamais un repère comme `<nom>`. Poser la même question (besoin, valeur trouvée, « Je l'utilise ? ») : « J'ai besoin du nom de ton serveur sur Render : il donne son URL publique, `https://<nom>.onrender.com`. ». Valeur trouvée : celle du ticket s'il la fixe, sinon `<nom-du-repo>-<prénom>-dev`. L'URL publique du serveur (ex. `<URL_PUBLIQUE_DU_SERVEUR>`) se déduit de ce nom : elle est écrite dans `render.yaml`, puis vérifiée à l'étape 4, une fois le serveur créé (Render ajoute un suffixe si le nom est déjà pris).

   **Une URL qui n'existe pas encore** (ex. celle du frontend en ligne, dans `<ORIGINES_AUTORISÉES>`) peut être prévue de la même façon, à partir du nom fixé dans le ticket. Elle est vérifiée quand elle existe, et corrigée si elle diffère.

   **Ne jamais lire `.env`** : il contient les vrais secrets, qui passeraient alors par la conversation. Les valeurs trouvées viennent seulement de `.env.example` ou des valeurs par défaut du code.

   Les valeurs validées s'écrivent dans `render.yaml` (`value:`). Les secrets (ex. `<URL_DE_LA_BASE>`, `<SECRET_D_AUTH>`) ne sont jamais demandés : ils restent en `sync: false` et l'utilisateur les saisit dans le dashboard.

3. **Écrire `render.yaml`.** Un blueprint qui déclare le serveur backend de DEV, sans jamais mettre les valeurs des secrets (`sync: false`). Format à suivre, avec dans `envVars` **exactement les clés de `.env.example`**, une entrée par clé, dans le même ordre. Les noms entre chevrons (`<…>`) sont des repères : les remplacer par les noms exacts trouvés dans `.env.example`.

   ```yaml
   services:
     - type: web
       name: <nom-du-serveur>   # validé à l'étape 2
       runtime: node
       plan: free   # sans cette ligne, Render prend l'offre payante et demande une carte
       branch: dev
       autoDeploy: true
       buildCommand: pnpm install --frozen-lockfile && pnpm build
       startCommand: pnpm start
       healthCheckPath: /health
       envVars:
         - key: <URL_DE_LA_BASE>
           sync: false
         - key: <SECRET_D_AUTH>
           sync: false
         - key: <URL_PUBLIQUE_DU_SERVEUR>
           value: https://<nom-du-serveur>.onrender.com   # déduite du nom, vérifiée à l'étape 4
         - key: <ORIGINES_AUTORISÉES>
           value: http://localhost:5173,https://<nom-du-frontend>.vercel.app   # validée à l'étape 2
   ```

   **`<URL_PUBLIQUE_DU_SERVEUR>` est l'URL publique du backend déployé** (ex. `https://<nom-du-serveur>.onrender.com`). La librairie d'authentification (ex. Better Auth) s'en sert pour son `baseURL` et pour poser les cookies de session en cross-site (`SameSite=None; Secure`) ; sans elle, le code retombe sur `http://localhost` et la session ne tient pas depuis un front sur un autre domaine. Ce n'est pas un secret : sa valeur se déduit du nom du serveur, et elle est vérifiée à l'étape 4.

   **Pas de `preDeployCommand` (migrations) en DEV.** La base Neon de DEV est la même en local et en ligne, et les migrations sont appliquées en local avec `prisma migrate dev` avant le push : `prisma migrate deploy` en CD ne trouverait jamais rien à faire. La ligne `preDeployCommand: pnpm prisma migrate deploy` appartient à la **PROD** (base séparée, où la CD est le seul endroit qui applique les migrations).

   **C'est le Blueprint Render qui applique ce fichier** (étape 4) : il le lit tel quel et honore `healthCheckPath` (et `preDeployCommand` le jour où il existera).

4. **Créer le serveur backend avec le Blueprint Render.** Guider l'utilisateur, une action à la fois, en attendant « C'est fait » après chacune :
   1. Faire arriver `render.yaml` sur `dev` (commit, PR, merge) : le Blueprint lit le fichier sur la branche qu'on lui indique.
   2. Dashboard Render : **New → Blueprint**, connecter le repo GitHub, choisir la branche `dev`.
   3. Render lit `render.yaml` et affiche le serveur backend à créer (dans le dashboard, Render l'appelle un « service »), avec tous ses réglages (branche, commandes, health check, variables).
   4. Saisir les secrets (voir ci-dessous), puis valider : Render crée le serveur backend et lance le 1er déploiement.
   5. Vérifier l'URL réelle du serveur, affichée en haut de sa page dans le dashboard : demander à l'utilisateur de la donner, et la comparer avec celle écrite dans `render.yaml`. Si elle diffère (nom déjà pris), corriger `render.yaml` et prévenir l'utilisateur de mettre à jour l'autre repo.

   ⚠️ À vérifier au 1er passage : Render demande les valeurs des variables en `sync: false` au moment de créer le Blueprint. Sinon, les saisir juste après dans les réglages du serveur backend (Environment).

   **Les valeurs des secrets ne passent pas par le chat.** L'utilisateur les saisit lui-même dans le dashboard. Sinon les valeurs transitent par la conversation (donc chez le fournisseur du modèle) et l'historique de session sur disque.

   **Guider la saisie des secrets, un par un.** Pour chaque clé en `sync: false`, dire à l'utilisateur où trouver la valeur, d'après les commentaires de `.env.example` (ex. `<URL_DE_LA_BASE>` : la console Neon, ou son propre `.env` ouvert dans l'éditeur ; `<SECRET_D_AUTH>` : en générer un nouveau avec `openssl rand -base64 32`, jamais celui d'un autre environnement), et où la coller. Attendre « C'est fait » avant la clé suivante.

   **Pourquoi pas le MCP Render.** Sa fonction de création (`create_web_service`) n'a pas de champ `healthCheckPath`, et il n'expose aucun outil pour modifier les réglages d'un serveur déjà créé : le health check resterait une étape dashboard. Les secrets se saisissent de toute façon dans le dashboard. Le Blueprint fait donc plus, avec moins d'installation (pas de clé d'API).

5. **Vérifier.** Déclencher / attendre un déploiement, puis appeler `/health` et `/db-health` sur le serveur backend de DEV pour confirmer que ça tient.

## Règles

- **DEV uniquement.** Ne pas créer de serveur de prod, ne pas poser de question DEV/PROD : il n'y a pas encore de branche de prod. La PROD est hors de ce skill.
- **Le déploiement passe par la CI/CD, pas par la ligne de commande.** Ce skill **met en place** le déploiement continu une fois ; il ne « déploie » pas à la demande. Un déploiement se déclenche au **merge vers `dev`**, pas par un appel manuel.
- **Actions à effet, donc confirmées.** Chaque action sur l'infra (merge, création du serveur backend) passe par l'accord de l'utilisateur.
- **Les secrets ne se commitent jamais.** Dans `render.yaml`, les secrets n'ont que leur **clé** (`sync: false`), leurs valeurs vivent dans Render. Seules les variables non secrètes, validées à l'étape 2, y ont une valeur.
- **Les migrations : un réglage PROD, pas DEV.** En DEV, la base Neon est partagée avec le local et les migrations y sont déjà appliquées via `prisma migrate dev` : `prisma migrate deploy` en CD serait un no-op, donc pas de `preDeployCommand`. En PROD, la base est séparée et la CD est le seul endroit qui applique les migrations. Là, `prisma migrate deploy` en `preDeployCommand` est obligatoire, sinon le code part et le schéma reste en arrière. Ne jamais le poser en DEV « au cas où ».
- **Le health check vient du Blueprint.** `healthCheckPath: /health` dans le `render.yaml` est honoré parce que le serveur backend est créé par le Blueprint. `/health` est la route de l'app.
- **Dire ce qui se fait à la main.** Ce qui passe par le dashboard est guidé étape par étape, jamais maquillé en « fait ».
- **Rapporter l'état réel.** Un déploiement rouge se montre avec ses logs.
