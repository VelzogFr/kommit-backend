# Inventaire des tests — KOM-06 · Authentification · backend

Source : ticket Notion KOM-06 (`Authentification · backend`), règles métier et section
« Contraintes techniques ». Doctrine appliquée : `docs/testing-strategy.md`.
Contrat d'API lu : `src/types/apiContract.ts` (codes `EMAIL_ALREADY_EXISTS`,
`INVALID_CREDENTIALS`, `VALIDATION_ERROR`, `INTERNAL_ERROR`).

Le découpage en 4 paquets ci-dessous est **celui du ticket**, dans son ordre.

---

### 1. Cas nominaux : création, connexion, déconnexion

| Règle | Ce qu'on vérifie | Testable unitaire ? | Pourquoi | Comment |
|---|---|---|---|---|
| RM8 | Signup valide : le compte est réellement créé et l'utilisateur est connecté automatiquement (cookie de session posé et rejoué en cross-origin) | 🔴 | Le comportement sous test est celui de Better Auth et du navigateur : la route `/sign-up/email` crée la ligne en base, pose le cookie, et la contrainte technique fait dépendre le résultat de 3 réglages réels (`credentials: true` côté CORS, `credentials: 'include'` côté front, `trustedOrigins`). Mocker Better Auth reviendrait à mocker exactement ce qu'on veut vérifier. | Manuel (smoke) |
| RM12 | Signin valide : email + mot de passe corrects, l'utilisateur est connecté | 🔴 | Même mécanisme que RM8 : la vérification du mot de passe haché et la pose du cookie de session sont le comportement de Better Auth, pas une logique à nous. La contrainte technique interdit d'écrire nos propres routes, il n'y a donc aucun code maison à isoler. | Manuel (smoke) |
| RM5 | Signout : la session est fermée, `/get-session` ne renvoie plus l'utilisateur | 🔴 | On vérifie que Better Auth invalide réellement la session et le cookie, puis que la requête suivante arrive sans session. Comportement de la dépendance et de son branchement. | Manuel (smoke) |

### 2. Valeurs refusées

| Règle | Ce qu'on vérifie | Testable unitaire ? | Pourquoi | Comment |
|---|---|---|---|---|
| RM10 | Email mal formé ou mot de passe de moins de 8 caractères : la requête est refusée, aucun compte créé | 🟢 | La contrainte technique impose que toute la validation se fasse côté serveur, avec **un seul schéma Zod** à nous. On teste ce schéma comme une fonction pure : entrée invalide → refus (`VALIDATION_ERROR`). Le minimum de 8 est une valeur de notre schéma, alignée sur le défaut de Better Auth. | Unitaire, test-first |
| RM11 | Signup sans prénom : la requête est refusée, aucun compte créé | 🟢 | Même schéma Zod, champ `name` (le champ natif de Better Auth, pas un `firstName` maison). Une règle de validation d'entrée est du code à nous, déterministe, sans dépendance à mocker. | Unitaire, test-first |
| RM20 | Prénom composé uniquement d'espaces : refusé exactement comme RM11 | 🟢 | C'est le `trim` du schéma Zod, appliqué avant la validation (contrainte technique : « c'est lui qui applique le retrait des espaces »). Transformation pure, testable directement. | Unitaire, test-first |

### 3. Unicité de l'email

| Règle | Ce qu'on vérifie | Testable unitaire ? | Pourquoi | Comment |
|---|---|---|---|---|
| RM9 | Email déjà utilisé : réponse `EMAIL_ALREADY_EXISTS`, aucun compte créé, jamais un 500 | 🟠 | Deux tranches. Notre mapping (erreur Better Auth / violation `UNIQUE` Prisma → `ApiError { code: 'EMAIL_ALREADY_EXISTS' }`) est du code à nous, testable en mockant la forme de l'erreur. Mais cette **forme mockée** est une hypothèse sur Better Auth et Prisma qu'aucun smoke ne confirme, et c'est la contrainte `UNIQUE` réelle qui arbitre le doublon. | Unitaire (mapping) + smoke manuel |
| RM21 | Unicité insensible à la casse et aux espaces : ` MARC@x.com ` refusé si `marc@x.com` existe | 🟠 | La normalisation (`trim` + minuscules dans le schéma Zod) est une transformation pure → unitaire. Reste dehors la tranche réelle : que la valeur normalisée soit bien celle envoyée au stockage **et** au contrôle d'unicité, et que la contrainte `UNIQUE` rejette la variante. Le smoke de RM9 ne la couvre pas (il rejoue l'email à l'identique). | Unitaire (normalisation) + smoke manuel |

### 4. Gestion des erreurs et pannes

| Règle | Ce qu'on vérifie | Testable unitaire ? | Pourquoi | Comment |
|---|---|---|---|---|
| RM13 | Identifiants incorrects au signin : réponse `INVALID_CREDENTIALS`, sans dire lequel des deux champs est faux | 🟠 | Le ré-emballage de l'erreur Better Auth vers `ApiError { code: 'INVALID_CREDENTIALS', message }` en français est notre code, testable en mockant l'erreur d'entrée. La forme réelle renvoyée par Better Auth sur un mot de passe faux n'est confirmée par aucun smoke : si elle diffère du mock, le mapping tombe en `INTERNAL_ERROR` sans qu'un test le voie. | Unitaire (mapping) + smoke manuel |
| RM18, RM19 | Panne (5xx, timeout) : sortie en `INTERNAL_ERROR`, distinct des erreurs métier, jamais une erreur brute | 🟠 | La branche par défaut du convertisseur (« ce qu'on ne reconnaît pas ressort en `INTERNAL_ERROR` ») est du code à nous, testable en lui passant une erreur inconnue. Reste dehors : qu'une vraie panne remonte bien jusqu'à notre middleware d'erreur et ne sorte pas en 500 par défaut d'Express, ce qu'aucun autre smoke ne traverse. | Unitaire (mapping) + smoke manuel |
| RM2 | Route protégée atteinte sans session : réponse 401 | 🟠 | La décision du middleware (pas de session → 401) est du code à nous : on mocke `getSession` à `null` et on vérifie le 401. Reste dehors la tranche réelle, et c'est la plus dangereuse : que le middleware soit effectivement monté sur la route et qu'un vrai cookie absent produise bien un 401. Les smokes des cas nominaux couvrent la session **présente**, jamais son absence. | Unitaire (décision) + smoke manuel |

---

## Récap

### 🟢 Test unitaire automatisé, test-first → `unit-test-writer`

- **RM10** — schéma Zod : email mal formé refusé, mot de passe < 8 caractères refusé.
- **RM11** — schéma Zod : prénom absent refusé.
- **RM20** — schéma Zod : prénom d'espaces seulement refusé après `trim`.

### 🟠 Couverture partielle : unitaire **+** smoke manuel

| Règle | Part unitaire (→ `unit-test-writer`) | Smoke manuel à ajouter (→ `smoke-test-writer`) |
|---|---|---|
| RM9 | mapping erreur `UNIQUE` / Better Auth → `EMAIL_ALREADY_EXISTS` | signup avec un email déjà en base → réponse `EMAIL_ALREADY_EXISTS`, pas un 500, et aucun second compte en base |
| RM21 | normalisation de l'email : `trim` + minuscules | créer `marc@x.com`, puis tenter ` MARC@x.com ` → refusé, un seul compte en base |
| RM13 | mapping erreur Better Auth → `INVALID_CREDENTIALS` | signin avec un mot de passe faux, puis avec un email inexistant → `INVALID_CREDENTIALS` dans les 2 cas, même message |
| RM18, RM19 | branche par défaut du convertisseur : erreur inconnue → `INTERNAL_ERROR` | provoquer une panne réelle (base injoignable, `DATABASE_URL` invalide) et appeler `/sign-in/email` → `INTERNAL_ERROR`, pas une erreur brute ni du HTML |
| RM2 | décision du middleware : `getSession` renvoie `null` → 401 | appeler une route protégée sans cookie → 401 ; refaire l'appel avec le cookie de session → succès |

### 🔴 Vérification manuelle uniquement → `smoke-test-writer`

- **RM8** — signup complet : compte créé en base **et** session ouverte dans la foulée ; la requête suivante depuis le front (`http://localhost:5173`) porte le cookie et renvoie l'utilisateur.
- **RM12** — signin complet : identifiants corrects, session ouverte, `/get-session` renvoie l'utilisateur.
- **RM5** — signout : la session est fermée, `/get-session` renvoie `null` juste après.

> Les 3 smokes ci-dessus valident aussi, de fait, les 3 réglages cross-origin exigés par les
> contraintes techniques (`credentials: true` côté CORS, `credentials: 'include'` côté front,
> origine du front dans `trustedOrigins`). Sans eux, RM8 et RM12 ne peuvent pas passer.
