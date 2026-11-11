---
name: setup-ci
description: Met en place la CI GitHub Actions du repo, jusqu'à une PR avec une CI verte. Utiliser quand l'utilisateur dit "setup-ci", "mets en place la CI", "écris la CI".
---

## Entrée

- Le **repo courant**, comprenant :
  - `package.json`, pour ses scripts `lint`, `build` et `test`, et son champ `packageManager` ;
  - le lockfile ;
  - `.nvmrc`, s'il existe.
- Optionnel : un **ticket de CI** (lien ou ID Notion). S'il est donné, le skill suit ses règles métier.

## Sortie

- Un fichier de config **`.nvmrc`**, qui fige la version de Node.
- Le fichier de config **`.github/workflows/ci.yml`**, avec au minimum 3 checks : lint, build, tests.
- Une **PR vers la branche cible** (ex. `dev`), avec une CI verte sur GitHub.

---

## Étapes

1. **Lire le repo, et le ticket s'il est donné.** Si un ticket est donné, en extraire les vérifications attendues et le déclencheur. Relever les scripts réels du `package.json`, le `.nvmrc`, le `packageManager`, le lockfile.

2. **Détecter les paquets critiques et les incompatibilités.** Avant d'écrire, repérer ce qui peut faire échouer un build, un lint ou un test :
   - **Node** : version installée vs LTS. Signaler une version impaire / non-LTS (ex. la 23) ou un écart entre `.nvmrc` et la version réellement utilisée.
   - **TypeScript vs `typescript-eslint`** : si TS ≥ 7, ESLint ne démarre pas (`typescript-eslint` plafonne à TS 6). C'est une incompatibilité à trancher, pas à subir.
   - **Variables exigées au chargement** : ex. un fichier de config qui fait `throw` si une variable manque, ou des tests qui importent la config d'env. Prévoir une valeur factice au bon step, sans jamais brancher de vraie base.
   - **Gestionnaire de paquets** : version pnpm cohérente avec le lockfile et le `packageManager`.

3. **Cadrer les décisions avec l'utilisateur (`AskUserQuestion`), avant d'écrire.** Ne demander que ce que **ni le ticket ni le repo ne tranchent déjà** : si une info est fixée sans ambiguïté dans le `package.json`, le `.nvmrc` ou le lockfile, l'utiliser telle quelle, sans question. On ne pose que les décisions non encodées et les valeurs présentes mais problématiques. Au minimum :
   1. **Nom de la CI** (le `name:` du workflow, affiché sur GitHub). Option recommandée : `CI <nom du repo>`, par exemple `CI kommit-backend`.
   2. **Version de Node à figer dans le `.nvmrc`** : proposer les LTS pertinentes. Si l'utilisateur est sur une version impaire / non-LTS (ex. la 23), le signaler et proposer une cible (ex. 22 ou 24).
   3. **Branche cible des PR**, si aucun ticket ne la donne : « Vers quelle branche vont tes PR ? ». Option recommandée : `dev`.
   4. **Niveaux de tests** : lancer les tests **unitaires** seuls, ou aussi **intégration**, ou aussi **e2e** ? Adapter aux niveaux qui existent réellement dans le repo.
   5. **Linter** : l'inclure ? Et si la détection a remonté une incompatibilité (TS ≥ 7 vs `typescript-eslint`), la poser explicitement : **aligner TypeScript** sur une version supportée, ou **renoncer au lint** dans la CI.
   6. Toute autre décision de version / compatibilité que l'étape 2 a fait remonter.

4. **Écrire le workflow.** S'il n'y a pas de `.nvmrc`, le créer avec la version de Node choisie (la dernière LTS par défaut). Puis `.github/workflows/ci.yml`, un seul job, déclencheur `pull_request` vers la branche cible. Installation de pnpm via `packageManager`, Node depuis `node-version-file: .nvmrc`, cache pnpm, `pnpm install --frozen-lockfile`, puis les **trois checks** dans l'ordre : **lint**, **build**, **tests** (au niveau choisi). Ne poser une étape que pour un script qui existe.

5. **Valider en local.** Rejouer la séquence exacte de la CI sur la machine, sous la version Node retenue. Au premier rouge, corriger et relancer jusqu'au vert.

6. **Ouvrir la PR.** Commiter `ci.yml` et `.nvmrc`, puis ouvrir la PR vers la branche cible avec le skill `open-pr`. C'est la PR qui déclenche la CI.

7. **Valider sur le run GitHub.** Surveiller le run (`gh run watch <id> --exit-status`). Au rouge, corriger, pousser et recommencer jusqu'au vert. Rapporter le résultat réel du run.

## Règles

- **Au minimum trois checks : build, tests, lint.** Le merge n'est autorisé que si les trois passent. Retirer un check (ex. lint rendu impossible par une incompatibilité) est une décision **explicite** de l'utilisateur, obtenue par question, jamais un choix silencieux du skill.
- **Poser les questions, ne pas deviner, mais ne demander que le non-tranché.** Utiliser `AskUserQuestion` pour les versions (Node, TypeScript), les niveaux de test et le linter dès que **ni le ticket ni le repo** ne les fixent. Si l'info est déjà déterminée sans ambiguïté dans le `package.json`, le `.nvmrc` ou le lockfile, l'utiliser sans demander : une valeur présente règle un **fait**, pas une **décision** ni une **incohérence**. On ne pose donc de question que pour (a) les décisions non encodées (ex. quels niveaux de test lancer en CI) et (b) les valeurs présentes mais problématiques (Node non-LTS comme la 23, incompatibilité TS ≥ 7 vs `typescript-eslint`). Ces cas-là se tranchent avec l'utilisateur, jamais en douce.
- **N'appeler que des scripts existants.** Le workflow lance `pnpm lint`, `pnpm build`, `pnpm test` tels qu'ils sont définis dans le repo. Ne jamais inventer une commande, ni poser une étape `pnpm lint` qui plantera (vérifier d'abord qu'elle tourne en local).
- **Pas de dépendance externe inutile.** Si aucun test n'en dépend (à vérifier dans les imports), pas de service Postgres, pas de `DATABASE_URL`, pas de migration dans la CI.
- **Le vrai vert est sur le run GitHub, pas seulement en local.** Certaines casses n'apparaissent qu'en CI : version de Node, cache pnpm, variable d'environnement absente (présente en local grâce au `.env`, absente sur la machine de GitHub). La validation finale se lit donc sur le **run réel** (étape 7). Ne jamais conclure « vert » sur la seule base du local.
- **Rapporter l'état réel.** Si une étape échoue, montrer la sortie réelle, ne pas prétendre que c'est vert.

---

## Exiger le check au merge (branch protection)

Bloquer le merge tant que la CI est rouge n'est **pas** dans le workflow : c'est un réglage GitHub, à poser une fois le workflow présent sur la branche cible et un check nommé (ex. `ci`) visible sur une PR. Ce n'est pas un skill à part, c'est cette étape finale de la mise en place de la CI.

- **Comment.** Récupérer le nom exact du check (`gh pr checks` / `gh run list`), puis poser la protection via `gh api` sur `repos/{owner}/{repo}/branches/{branche}/protection` en exigeant ce check. Action à effet : confirmer avec l'utilisateur avant de poser, ne rien relâcher en silence.
- **⚠️ Limite plan privé (à vérifier en premier).** Sur un repo **privé en plan gratuit**, l'API de branch protection **et** les rulesets renvoient `403 « Upgrade to GitHub Pro or make this repository public »`, en lecture comme en création. On ne peut alors **rien poser**, et une règle définie à la main dans l'interface n'est de toute façon **pas appliquée** tant que le repo est privé. Le vérifier avant tout, le dire à l'utilisateur (disponible seulement en repo public ou sur un plan payant), et ne jamais prétendre avoir posé la protection.
