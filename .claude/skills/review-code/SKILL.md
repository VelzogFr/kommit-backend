---
name: review-code
description: Fait relire le travail du ticket par l'agent code-reviewer, et restitue sa revue telle quelle. Prépare son contexte (périmètre, ticket, points déjà connus), le lance une fois, ne corrige rien. Utiliser quand l'utilisateur dit "relis mon code", "review", "code review", "fais la revue", "lance le code reviewer".
---

## Entrée

- Le **périmètre à relire**, optionnel. Sans précision, le diff de la branche courante face à `dev`.
- Le **ticket en cours**, s'il est connu de la conversation, pour que l'agent sache ce que le code était censé faire.

## Sortie

- La **revue de l'agent `code-reviewer`, restituée telle quelle** à l'utilisateur : le titre de verdict et de bilan, le tableau compact des défauts, l'invitation à développer un numéro.
- Le **détail d'un défaut**, quand l'utilisateur en demande le numéro : son emplacement, le mécanisme, la correction proposée.

Ce skill **ne relit rien lui-même** et **ne corrige rien**. Il prépare le contexte, lance l'agent, et rend sa sortie.

---

## Étapes

1. **Rassembler le contexte** que l'agent n'a aucun moyen de deviner, et le mettre dans son prompt :
   - le périmètre (par défaut le diff face à `dev`, sinon les fichiers ou le numéro de PR donnés) ;
   - ce que le ticket demandait, et le lien Notion s'il est connu ;
   - les **fichiers les plus risqués** de la livraison, nommés, avec ce qu'ils font ;
   - l'**état des vérifications** déjà passées (tests, typecheck, lint, smokes exécutés ou non) ;
   - les **points déjà connus**, en demandant à l'agent de dire s'il les juge plus graves que ce qu'on a estimé, plutôt que de les redécouvrir.
2. **Lancer `code-reviewer`, une seule fois.** Sa revue est un document structuré, classé par gravité : plusieurs lancements produisent plusieurs classements qui ne se recollent pas.
3. **Restituer sa revue telle quelle**, en commençant par le titre de verdict, sans rien écrire au-dessus.
4. **Rendre le détail à la demande.** L'utilisateur donne un numéro, on développe ce défaut-là.
5. **Ne corriger que ce qu'il demande.** Il décide, défaut par défaut.

## Règles

- **Restituer la revue telle quelle, sans la reformuler.** Ni résumé, ni prose, ni sélection des défauts qu'on juge importants. Le titre de verdict, le tableau et l'invitation arrivent à l'utilisateur dans la forme où l'agent les a écrits.
- **Le titre de verdict passe en premier, et rien ne le précède.** Pas de phrase d'introduction, pas de mise en contexte : l'utilisateur veut le verdict puis le tableau, pas un préambule. Ce qui n'est pas dans le tableau attend qu'il demande un numéro.
- **Ne jamais gonfler une cellule.** Recopier un paragraphe dans la colonne « Problème » fait s'effondrer les colonnes et rend la revue illisible dans un terminal — c'est la panne que ce format existe pour éviter.
- **Le format appartient à l'agent.** Il est défini une seule fois, dans sa section `## Sortie` et dans son « Format de la revue ». Ne pas le redécrire ici : deux définitions du même tableau divergeraient à la première colonne ajoutée.
- **Un seul lancement**, jamais un par fichier ni par couche.
- **Ne corriger aucun défaut de sa propre initiative.** Le skill s'arrête à la revue. Une correction se demande.
- **Ne pas plaider pour son propre code.** Quand la revue épingle quelque chose qu'on a écrit soi-même, on le rapporte comme le reste. Si un défaut est faux, le dire une fois avec l'argument, sans supprimer la ligne du tableau.
- **Ne pas inventer de contexte.** Ce qu'on ne sait pas du ticket, on ne le met pas dans le prompt de l'agent.
