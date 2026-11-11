# Stratégie de test

Ce document décrit **ce qu'il faut tester, comment le tester et quand le tester**. Il dit
aussi à quel moment les subagents `unit-test-writer` et `smoke-test-writer`, ainsi que le
skill `write-code`, s'appliquent, et à quel moment non.

| Question | Réponse |
|---|---|
| **Que** faut-il tester ? | les règles métier du ticket |
| **Comment** ? | test unitaire automatisé 🟢, smoke test manuel 🔴, ou les deux 🟠 |
| **Quand** ? | avant le code, toujours |

Le « que » et le « quand » tiennent en une section chacun. Tout le reste du document détaille le « comment », parce que c'est le seul des 3 qui se retranche ticket par ticket.

## Que faut-il tester ?

**Les tests se dérivent des règles métier du ticket, jamais du code existant.** Le ticket
dit ce que le système doit faire ; c'est lui la source, et il n'y a pas d'autre inventaire
à chercher. Un test qui ne remonte à aucune règle du ticket n'a rien à vérifier.

Corollaire : **on peut écrire les tests avant que la moindre ligne de code existe**, puisque
la spec est déjà tranchée dans le ticket. C'est ce qui rend le test-first possible ici, et
c'est pour ça que tout ce document parle de tests écrits avant l'implémentation.

## L'idée principale

Ne pas partir par réflexe sur « j'écris d'abord des tests unitaires, puis j'implémente
pour les faire passer ». C'est le cas le plus **fréquent**, pas la règle universelle.
Certaines règles ne se testent pas en unitaire — les forcer dans ce moule fait écrire des
tests qui mockent exactement ce qu'on voulait vérifier.

Donc, une seule question de tri : **cette règle est-elle testable en unitaire, ou non ?**
La réponse peut être « les deux à la fois » — c'est le troisième état, 🟠 (voir plus bas).

## Pourquoi ce tri, et pas des niveaux de test

Le niveau d'un test est un **niveau de zoom** : le test unitaire regarde une fonction, le
end-to-end regarde le parcours complet, et le test d'intégration se situe entre les deux.
Il existe tout un savoir-faire autour de ces niveaux : reconnaître un bon d'un mauvais
test, les mettre en place, les brancher en CI/CD. **Dans CCE, on ne traite pas ça** : le
but de la formation, c'est Claude Code, pas le testing.

Ici, on garde les niveaux et on abandonne leur **automatisation**. Automatiser un zoom
plus large demande un environnement complet à monter et à maintenir, et ce coût ne
disparaît pas parce que l'IA écrit les tests.

On automatise donc **le test unitaire**, le moins coûteux à faire tourner, et tout ce qui
demande un zoom plus large se **vérifie à la main**, sous forme de smoke. On y perd la
non-régression : un smoke passé aujourd'hui ne prévient de rien dans 6 mois.

> La profondeur (les niveaux intégration / e2e, bons vs mauvais tests, la mise en place, la
> CI/CD avec GitHub Actions) est **hors périmètre ici** — on n'en parle pas.

## La question de tri, par paquet de règles

Pour chaque règle (on suit le découpage du ticket) : **testable en unitaire ?** Trois
verdicts possibles :

- **🟢 Oui** → test unitaire **automatisé**, écrit en **test-first** : test rouge d'abord,
  puis implémentation jusqu'au vert.
- **🔴 Non** → **vérification manuelle** (smoke) : le scénario s'écrit avant l'implémentation
  (subagent `smoke-test-writer`, fichier `testing/smokes-<TICKET_ID>.md`), puis s'exécute
  à la main après (curl, Postman).
- **🟠 Partiel** → **les deux**. Le test unitaire couvre une tranche précise (notre logique)
  mais laisse une tranche réelle, distincte, qu'aucune ligne manuelle ne couvre déjà :
  typiquement un mapping qui mocke une **forme d'erreur de la dépendance** qu'aucun smoke ne
  vient confirmer. Un 🟠 = une ligne unitaire (test-first) **plus** un smoke manuel à ajouter.

## Comment savoir si c'est unitaire

La question à se poser : **qu'est-ce que je vérifie exactement ?**

- **Du code à moi** — une transformation, un calcul, une décision (`null` vs erreur), une
  validation. Même s'il appelle une dépendance externe, on la **mocke** et on teste la
  logique autour → **unitaire**.
- **Le comportement réel d'une dépendance et son branchement** — le compte se crée
  vraiment, la session se pose, la contrainte `UNIQUE` rejette le doublon. Le mocker
  reviendrait à mocker exactement ce qu'on teste → **pas unitaire → vérification manuelle**.

Présence d'une dépendance externe ≠ non-testable en unitaire. Ce qui rend non-unitaire,
c'est que **le comportement sous test est celui de la dépendance elle-même**, pas une
logique à nous.

## Définitions

- **Test unitaire** — isole une fonction / un service, dépendances externes mockées,
  tourne en mémoire, déterministe et rapide.
- **Vérification manuelle (smoke)** — un humain tape l'endpoint à la main (curl, Postman) et
  vérifie que le parcours critique tient debout. « Smoke » = grossier, on regarde juste si
  ça marche du tout, pas une suite exhaustive.

## Exemple appliqué — une to-do list

L'exemple est volontairement pris **en dehors du projet** : la doctrine vaut pour n'importe quel code base, et l'illustrer avec le ticket en cours donnerait son tri déjà fait.

Le ticket découpe la fonctionnalité en paquets de règles. Chaque règle est classée sur les trois états :

| Paquet de règles (ticket) | Ce qu'on vérifie | Verdict | Comment |
|---|---|---|---|
| Création d'une tâche | titre obligatoire et ≤ 200 caractères, validation Zod (🟢) ; la tâche est réellement écrite en base et ressort avec son id (🔴) | 🟢 / 🔴 | Unitaire test-first + manuel |
| Titre unique dans une liste | normalisation du titre avant comparaison (🟢) ; mapping `UNIQUE` → `TITLE_ALREADY_EXISTS`, dont la forme d'erreur mockée n'est confirmée par aucun smoke (🟠) ; contrainte `UNIQUE` qui arbitre 2 créations en concurrence (🔴) | 🟢 / 🟠 / 🔴 | Unitaire test-first + smoke + manuel |
| Rappel envoyé à l'échéance | la date de déclenchement calculée à partir de l'échéance et du fuseau (🟢) ; mapping d'un refus du service d'emailing → `REMINDER_FAILED`, forme d'erreur mockée qu'aucun smoke ne confirme (🟠) ; l'email part vraiment et le service l'accepte (🔴) | 🟢 / 🟠 / 🔴 | Unitaire test-first + smoke + manuel |
| Compteur de tâches restantes | le calcul du nombre de tâches non terminées | 🟢 | Unitaire, test-first |

Les 2 🟠 ne sont pas le même cas : le premier mocke la forme d'une erreur de la **base**, le second celle d'une erreur d'un **service tiers**. Dans les deux, le test unitaire couvre notre mapping et laisse dehors une tranche réelle qu'aucun smoke ne couvre déjà, d'où le smoke à ajouter.

À retenir : un même paquet de règles peut mélanger les trois états. On ne classe pas « pour
le paquet », on classe **par ce qu'on vérifie**, règle par règle.
