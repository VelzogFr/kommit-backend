---
name: open-pr
description: Amène le travail terminé jusqu'à la Pull Request, sans merger. Passe un verrou de qualité bloquant (lint + typecheck + test), pousse la branche, ouvre la PR vers dev, et s'arrête là. Ne déplace aucun ticket et ne merge jamais. Utiliser quand l'utilisateur dit "ouvre la PR", "open pr", "envoie en review", "c'est fini, on pousse".
---

## Entrée

- La **branche courante**, considérée comme terminée par l'utilisateur : travail commité, pas encore poussé.

## Sortie

- L'**URL de la PR** ouverte vers `dev`.

Le skill s'arrête là. Il ne merge pas, et **ne touche pas au ticket Notion** : tant que rien n'est mergé ni déployé, il n'y a rien à tester — le ticket reste où il est et n'ira en `TESTING` qu'après le merge et le déploiement.

---

## Étapes

1. **Vérifier le point de départ.** `git status` et branche courante. S'il reste des changements non commités, le signaler et demander — ne pas commiter à la place de l'utilisateur.
2. **Passer le verrou.** `pnpm lint`, puis `pnpm typecheck`, puis `pnpm test`.
3. **Pousser.** `git push -u origin <branche>`.
4. **Ouvrir la PR.** `gh pr create --base dev --head <branche>`, titre clair et corps dérivé des commits de la branche. Afficher l'URL.

## Règles

- **Le verrou est bloquant.** Au premier rouge : on s'arrête, on montre la sortie réelle de la commande, et **rien n'est poussé**. Ne jamais contourner un test qui échoue ni le désactiver pour pouvoir pousser.
- **⛔ Ne jamais merger.** Le merge vers `dev` est une décision explicite de l'utilisateur, donnée pour CETTE PR précise (cf. la rule Git du repo). Ouvrir la PR ne vaut pas autorisation.
- **Un seul repo à la fois** : celui de la branche courante. Ne pas pousser ni ouvrir de PR pour un autre repo.
- **Rapporter l'état réel.** Si une étape échoue (push refusé, `gh` non authentifié), le dire franchement avec l'erreur — ne pas prétendre que c'est fait.
