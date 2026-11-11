# Smokes manuels — KOM-06 · Authentification · backend

Scénarios de **vérification manuelle**, dérivés de `testing/inventaire-KOM-06.md`
(règles 🔴 + colonne « Smoke manuel à ajouter » des 🟠). Codes d'erreur attendus repris de
`src/types/apiContract.ts`.

> ⏱️ **Ces scénarios s'écrivent avant l'implémentation, mais s'exécutent après.**
> Tant que le code de KOM-06 n'est pas là, il n'y a rien à cocher.

Les sections et l'ordre des règles sont **ceux de l'inventaire**, pour que les 2 fichiers se
lisent côte à côte. Les 🟢 apparaissent dans les tableaux récap, sans scénario : elles sont
couvertes par les tests unitaires.

## Variables communes

À exporter une fois dans le terminal avant de dérouler les scénarios :

```bash
export BASE_URL="http://localhost:3000"
export AUTH_BASE="$BASE_URL/api/auth"   # confirmé : monté ici dans app.ts
export FRONT_ORIGIN="http://localhost:5173"
export JAR="/tmp/kommit-cookies.txt"
```

Préconditions valables pour tous les scénarios :

- le serveur tourne (`pnpm dev`) et `DATABASE_URL` pointe sur une base joignable ;
- `psql` est disponible pour les vérifications en base (sinon, remplacer par Prisma Studio) ;
- le pot à cookies est vide au début de chaque scénario : `rm -f "$JAR"`.

Note sur les vérifications en base : la table utilisateurs de Better Auth s'appelle `user`
par défaut. Adapter le nom si le schéma Prisma le renomme.

---

## 1. Cas nominaux : création, connexion, déconnexion

| Règle | Inventaire | Ce qu'on vérifie | Scénario |
|---|---|---|---|
| RM8 | 🔴 | Signup valide : compte réellement créé en base **et** session ouverte, cookie rejoué en cross-origin | [S1 — Signup complet](#s1--rm8--signup-complet-compte-créé-et-session-ouverte) |
| RM12 | 🔴 | Signin valide : identifiants corrects, session ouverte, `/get-session` renvoie l'utilisateur | [S2 — Signin complet](#s2--rm12--signin-complet-session-ouverte) |
| RM5 | 🔴 | Signout : session fermée, `/get-session` ne renvoie plus l'utilisateur | [S3 — Signout](#s3--rm5--signout-session-fermée) |

---

### S1 — RM8 — Signup complet : compte créé et session ouverte

> ✅ **Ce qu'on vérifie :**
>
> - Un signup valide (prénom + email libre + mot de passe ≥ 8) crée réellement la ligne utilisateur en base.
> - La même réponse ouvre la session : un cookie de session est posé, sans second appel.
> - La requête suivante émise depuis l'origine du front (`http://localhost:5173`) porte ce cookie et renvoie l'utilisateur, ce qui valide au passage les 3 réglages cross-origin (`credentials: true` côté CORS, `trustedOrigins` de Better Auth, `credentials: 'include'` côté front).
> - **Pourquoi à la main :** le comportement sous test est celui de Better Auth et du navigateur. Mocker Better Auth reviendrait à mocker exactement ce qu'on veut vérifier.

**Préconditions**

- Aucun compte `smoke1@x.com` en base : `psql "$DATABASE_URL" -c "delete from \"user\" where email = 'smoke1@x.com';"`
- `rm -f "$JAR"`

**Étapes**

1. Signup, en simulant l'origine du front, et en gardant le cookie :

```bash
curl -i -c "$JAR" \
  -X POST "$AUTH_BASE/sign-up/email" \
  -H "Content-Type: application/json" \
  -H "Origin: $FRONT_ORIGIN" \
  -d '{"name":"Marc","email":"smoke1@x.com","password":"motdepasse8"}'
```

2. Rejouer le cookie sur la session, toujours depuis l'origine du front :

```bash
curl -i -b "$JAR" \
  "$AUTH_BASE/get-session" \
  -H "Origin: $FRONT_ORIGIN"
```

3. Vérifier la ligne en base :

```bash
psql "$DATABASE_URL" -c "select id, name, email from \"user\" where email = 'smoke1@x.com';"
```

**Résultat attendu**

- Étape 1 : `200`, un en-tête `Set-Cookie` de session est présent, et l'en-tête
  `Access-Control-Allow-Credentials: true` accompagne la réponse (sans lui le navigateur
  jetterait le cookie).
- Étape 2 : `200` avec un corps qui porte l'utilisateur, aux champs du contrat
  (`Session` → `{ user: { id, name, email } }`), `email` valant `smoke1@x.com` et `name`
  valant `Marc`. Un corps `null` ici = la session n'a pas été ouverte ou le cookie n'est pas
  rejoué → RM8 échoue.
- Étape 3 : exactement 1 ligne, `email = smoke1@x.com`.

- [x] S1 exécuté et conforme

---

### S2 — RM12 — Signin complet : session ouverte

> ✅ **Ce qu'on vérifie :**
>
> - Avec un email et un mot de passe corrects, l'utilisateur est connecté : cookie de session posé.
> - `/get-session` renvoie ensuite l'utilisateur attendu.
> - **Pourquoi à la main :** la vérification du mot de passe haché et la pose du cookie sont le comportement de Better Auth, pas une logique à nous. La contrainte technique interdit les routes maison, il n'y a aucun code isolable.

**Préconditions**

- Le compte `smoke1@x.com` existe (créé en S1).
- `rm -f "$JAR"` (on repart sans session).

**Étapes**

1. Signin :

```bash
curl -i -c "$JAR" \
  -X POST "$AUTH_BASE/sign-in/email" \
  -H "Content-Type: application/json" \
  -H "Origin: $FRONT_ORIGIN" \
  -d '{"email":"smoke1@x.com","password":"motdepasse8"}'
```

2. Lire la session :

```bash
curl -i -b "$JAR" "$AUTH_BASE/get-session" -H "Origin: $FRONT_ORIGIN"
```

**Résultat attendu**

- Étape 1 : `200` avec un `Set-Cookie` de session.
- Étape 2 : `200`, corps portant `user.email = "smoke1@x.com"` et `user.name = "Marc"`.

- [x] S2 exécuté et conforme

---

### S3 — RM5 — Signout : session fermée

> ✅ **Ce qu'on vérifie :**
>
> - Après un signout, la session est réellement invalidée côté serveur.
> - `/get-session` rejoué juste après ne renvoie plus l'utilisateur.
> - **Pourquoi à la main :** on vérifie que Better Auth invalide la session et le cookie, puis que la requête suivante arrive sans session. C'est le comportement de la dépendance et de son branchement.

**Préconditions**

- Une session ouverte dans `$JAR` (enchaîner directement après S2).

**Étapes**

1. Signout avec le cookie de session :

```bash
curl -i -b "$JAR" -c "$JAR" \
  -X POST "$AUTH_BASE/sign-out" \
  -H "Origin: $FRONT_ORIGIN"
```

2. Relire la session immédiatement, avec le même pot à cookies :

```bash
curl -i -b "$JAR" "$AUTH_BASE/get-session" -H "Origin: $FRONT_ORIGIN"
```

**Résultat attendu**

- Étape 1 : `200`, et un `Set-Cookie` qui vide / expire le cookie de session.
- Étape 2 : `200` avec un corps `null` (le contrat : `Session` vaut `null` quand personne
  n'est connecté). Recevoir encore l'utilisateur = la session n'a pas été fermée → RM5 échoue.

- [x] S3 exécuté et conforme

---

## 2. Valeurs refusées

| Règle | Inventaire | Ce qu'on vérifie | Scénario |
|---|---|---|---|
| RM10 | 🟢 | Email mal formé ou mot de passe < 8 caractères refusé (`VALIDATION_ERROR`) | aucun smoke, couvert en unitaire |
| RM11 | 🟢 | Signup sans prénom refusé | aucun smoke, couvert en unitaire |
| RM20 | 🟢 | Prénom d'espaces seulement refusé après `trim` | aucun smoke, couvert en unitaire |

---

## 3. Unicité de l'email

| Règle | Inventaire | Ce qu'on vérifie | Scénario |
|---|---|---|---|
| RM9 | 🟠 | Signup sur un email déjà en base → `EMAIL_ALREADY_EXISTS`, jamais un 500, aucun second compte | [S4 — Email déjà pris](#s4--rm9--email-déjà-pris-email_already_exists-et-pas-de-second-compte) |
| RM21 | 🟠 | ` MARC@x.com ` refusé si `marc@x.com` existe, un seul compte en base | [S5 — Unicité insensible à la casse et aux espaces](#s5--rm21--unicité-insensible-à-la-casse-et-aux-espaces) |

---

### S4 — RM9 — Email déjà pris : `EMAIL_ALREADY_EXISTS` et pas de second compte

> ✅ **Ce qu'on vérifie :**
>
> - Un signup rejoué à l'identique ressort en `ApiError { code: "EMAIL_ALREADY_EXISTS" }`, avec un message en français.
> - La réponse n'est jamais un 500 ni une erreur brute de Better Auth ou de Prisma.
> - Aucun second compte n'est créé.
> - **Pourquoi à la main (part 🟠) :** l'unitaire couvre notre mapping en mockant la forme de l'erreur. Cette forme mockée reste une hypothèse sur Better Auth et Prisma qu'aucun test automatisé ne confirme, et c'est la contrainte `UNIQUE` réelle qui arbitre le doublon.

**Préconditions**

- Le compte `smoke1@x.com` existe (créé en S1).

**Étapes**

1. Rejouer le même signup, à l'identique :

```bash
curl -i -X POST "$AUTH_BASE/sign-up/email" \
  -H "Content-Type: application/json" \
  -H "Origin: $FRONT_ORIGIN" \
  -d '{"name":"Marc","email":"smoke1@x.com","password":"motdepasse8"}'
```

2. Compter les lignes :

```bash
psql "$DATABASE_URL" -c "select count(*) from \"user\" where email = 'smoke1@x.com';"
```

**Résultat attendu**

- Étape 1 : statut **4xx** (jamais `5xx`), corps JSON à la forme `ApiError` :
  `{"code":"EMAIL_ALREADY_EXISTS","message":"…"}`, `message` en français. Un `500`, un
  `INTERNAL_ERROR`, un message anglais de Better Auth ou une trace Prisma = échec.
- Étape 2 : `count = 1`.

- [x] S4 exécuté et conforme

---

### S5 — RM21 — Unicité insensible à la casse et aux espaces

> ✅ **Ce qu'on vérifie :**
>
> - Avec `marc@x.com` déjà en base, la variante ` MARC@x.com ` (majuscules + espaces autour) est refusée en `EMAIL_ALREADY_EXISTS`.
> - Un seul compte existe au bout du compte.
> - **Pourquoi à la main (part 🟠) :** l'unitaire couvre la normalisation (`trim` + minuscules) comme transformation pure. Reste dehors : que la valeur normalisée soit bien celle envoyée au stockage **et** au contrôle d'unicité. Le smoke de RM9 ne le couvre pas, il rejoue l'email à l'identique.

**Préconditions**

- Aucun compte `marc@x.com` : `psql "$DATABASE_URL" -c "delete from \"user\" where lower(email) = 'marc@x.com';"`

**Étapes**

1. Créer le compte de référence :

```bash
curl -i -X POST "$AUTH_BASE/sign-up/email" \
  -H "Content-Type: application/json" \
  -H "Origin: $FRONT_ORIGIN" \
  -d '{"name":"Marc","email":"marc@x.com","password":"motdepasse8"}'
```

2. Tenter la variante, avec majuscules et espaces autour :

```bash
curl -i -X POST "$AUTH_BASE/sign-up/email" \
  -H "Content-Type: application/json" \
  -H "Origin: $FRONT_ORIGIN" \
  -d '{"name":"Marc","email":"  MARC@x.com  ","password":"motdepasse8"}'
```

3. Compter les lignes, casse ignorée :

```bash
psql "$DATABASE_URL" -c "select email from \"user\" where lower(trim(email)) = 'marc@x.com';"
```

**Résultat attendu**

- Étape 1 : `200`, compte créé.
- Étape 2 : statut **4xx** avec `{"code":"EMAIL_ALREADY_EXISTS","message":"…"}`. Un `200`
  (second compte créé) ou un `VALIDATION_ERROR` = échec de RM21.
- Étape 3 : exactement **1 ligne**, et l'email stocké est `marc@x.com` en minuscules et sans
  espaces.

- [x] S5 exécuté et conforme

---

## 4. Gestion des erreurs et pannes

| Règle | Inventaire | Ce qu'on vérifie | Scénario |
|---|---|---|---|
| RM13 | 🟠 | Mot de passe faux et email inexistant → `INVALID_CREDENTIALS`, même message dans les 2 cas | [S6 — Identifiants incorrects](#s6--rm13--identifiants-incorrects-même-réponse-dans-les-2-cas) |
| RM18, RM19 | 🟠 | Panne réelle (base injoignable) → `INTERNAL_ERROR`, ni erreur brute ni HTML | [S7 — Panne réelle](#s7--rm18-rm19--panne-réelle-sortie-en-internal_error) |
| RM2 | 🟠 | Route protégée sans cookie → 401 ; avec le cookie de session → succès | [S8 — Route protégée](#s8--rm2--route-protégée-401-sans-session-succès-avec) |

---

### S6 — RM13 — Identifiants incorrects : même réponse dans les 2 cas

> ✅ **Ce qu'on vérifie :**
>
> - Un mot de passe faux sur un compte existant ressort en `ApiError { code: "INVALID_CREDENTIALS" }`.
> - Un email inexistant ressort **exactement pareil** : même code, même message, même statut. Rien ne révèle lequel des 2 champs est faux.
> - **Pourquoi à la main (part 🟠) :** l'unitaire couvre le ré-emballage en mockant l'erreur d'entrée. La forme réelle renvoyée par Better Auth sur un mot de passe faux n'est confirmée par aucun test : si elle diffère du mock, le mapping tombe en `INTERNAL_ERROR` sans qu'un test le voie.

**Préconditions**

- Le compte `smoke1@x.com` existe (créé en S1), mot de passe `motdepasse8`.
- Aucun compte `inconnu@x.com`.

**Étapes**

1. Bon email, mauvais mot de passe :

```bash
curl -i -X POST "$AUTH_BASE/sign-in/email" \
  -H "Content-Type: application/json" \
  -H "Origin: $FRONT_ORIGIN" \
  -d '{"email":"smoke1@x.com","password":"mauvaispassword"}'
```

2. Email inexistant, mot de passe quelconque :

```bash
curl -i -X POST "$AUTH_BASE/sign-in/email" \
  -H "Content-Type: application/json" \
  -H "Origin: $FRONT_ORIGIN" \
  -d '{"email":"inconnu@x.com","password":"motdepasse8"}'
```

**Résultat attendu**

- Les 2 étapes renvoient **le même statut 4xx** et **le même corps** :
  `{"code":"INVALID_CREDENTIALS","message":"…"}`, message en français, identique caractère
  pour caractère entre les 2 réponses.
- Aucun `Set-Cookie` de session dans l'une ou l'autre.
- Un `INTERNAL_ERROR`, un `EMAIL_ALREADY_EXISTS` ou 2 messages différents = échec : le
  second cas dirait qu'un email n'existe pas, ce que RM13 interdit.

- [x] S6 exécuté et conforme

---

### S7 — RM18, RM19 — Panne réelle : sortie en `INTERNAL_ERROR`

> ✅ **Ce qu'on vérifie :**
>
> - Une vraie panne d'infrastructure (base injoignable) remonte jusqu'à notre middleware d'erreur.
> - Elle ressort en `ApiError { code: "INTERNAL_ERROR" }`, distincte des erreurs métier, jamais en 500 par défaut d'Express (page HTML, trace de pile, message anglais de Prisma).
> - **Pourquoi à la main (part 🟠) :** l'unitaire couvre la branche par défaut du convertisseur avec une erreur inconnue. Qu'une panne réelle traverse toute la chaîne jusqu'au middleware n'est couvert par aucun autre scénario.

> ⚠️ **Scénario en limite de smoke** : il demande de modifier `.env` et de redémarrer le
> serveur, soit 4 étapes dont 2 de mise en place. Le garder en dernier et remettre `.env`
> en état juste après.

**Préconditions**

- Serveur arrêté.
- Sauvegarder la valeur réelle de `DATABASE_URL` avant de la casser.

**Étapes**

1. Dans `.env`, remplacer `DATABASE_URL` par une URL syntaxiquement valide mais injoignable
   (la variable doit rester présente, sinon `appConfig` refuse de démarrer) :

```bash
DATABASE_URL="postgresql://user:password@127.0.0.1:1/dbname"
```

2. Démarrer le serveur : `pnpm dev`.
3. Appeler le signin :

```bash
curl -i -X POST "$AUTH_BASE/sign-in/email" \
  -H "Content-Type: application/json" \
  -H "Origin: $FRONT_ORIGIN" \
  -d '{"email":"smoke1@x.com","password":"motdepasse8"}'
```

4. Restaurer `DATABASE_URL` et redémarrer.

**Résultat attendu**

- Étape 3 : statut `5xx`, `Content-Type: application/json`, corps
  `{"code":"INTERNAL_ERROR","message":"…"}` avec un message en français.
- Aucune page HTML d'erreur Express, aucune trace de pile, aucun texte anglais de Prisma ou
  de Better Auth dans le corps.
- Le code ne doit surtout pas être `INVALID_CREDENTIALS` : le front doit pouvoir afficher un
  message distinct d'une erreur métier.

- [x] S7 exécuté et conforme

---

### S8 — RM2 — Route protégée : 401 sans session, succès avec

> ✅ **Ce qu'on vérifie :**
>
> - Une requête sur une route protégée, sans cookie de session, reçoit un **401**.
> - La même requête avec un cookie de session valide passe.
> - **Pourquoi à la main (part 🟠) :** l'unitaire couvre la décision du middleware (`getSession` à `null` → 401). Reste dehors, et c'est le plus dangereux : que le middleware soit **effectivement monté** sur la route. Les smokes nominaux couvrent la session présente, jamais son absence.

> ⚠️ **Variable à ajuster** : aucune route protégée n'existe encore dans ce repo (les routes
> montées sont `/`, `/health`, `/db-health`). Renseigner ci-dessous la route protégée livrée
> par KOM-06 avant d'exécuter.

```bash
export PROTECTED_URL="$BASE_URL/me"
```

**Préconditions**

- `rm -f "$JAR"` pour l'étape 1.
- Le compte `smoke1@x.com` existe, pour rouvrir une session à l'étape 2.

**Étapes**

1. Appeler la route protégée sans aucun cookie :

```bash
curl -i "$PROTECTED_URL" -H "Origin: $FRONT_ORIGIN"
```

2. Ouvrir une session, puis rejouer le même appel avec le cookie :

```bash
curl -s -c "$JAR" -X POST "$AUTH_BASE/sign-in/email" \
  -H "Content-Type: application/json" -H "Origin: $FRONT_ORIGIN" \
  -d '{"email":"smoke1@x.com","password":"motdepasse8"}'

curl -i -b "$JAR" "$PROTECTED_URL" -H "Origin: $FRONT_ORIGIN"
```

**Résultat attendu**

- Étape 1 : **401**. Un **404** signifierait que `PROTECTED_URL` est mal renseignée ou que la
  route n'est pas montée, pas que la protection marche. Un **200** signifierait que le
  middleware de session n'est pas monté sur cette route : c'est l'échec que ce scénario
  existe pour attraper.
- Étape 2 : statut de succès (`200`), la réponse est celle de la route.

- [x] S8 exécuté et conforme
