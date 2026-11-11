# Commentaires — seulement les utiles, et courts

Un commentaire ne se justifie que s'il apporte une information **que le code ne dit pas déjà**. Par défaut, ne pas commenter.

## Ce qui mérite un commentaire

- Le **pourquoi** non évident : une décision, un piège, une contrainte, un lien vers une règle métier du ticket. Ex. « le statut d'origine est conservé : une erreur métier reste un 4xx, elle ne devient jamais un 500 (RM9) ».
- Un choix contre-intuitif qu'un lecteur voudrait « corriger » sans le contexte.
- Un **comportement de dépendance relevé à la source**, que sa documentation ne dit pas. Ex. « vérifié dans better-auth 1.7.2 : le code est `USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL`, et non `USER_ALREADY_EXISTS` ». Ces trouvailles-là n'existent nulle part ailleurs, et les retrouver coûte une demi-heure.

## Ce qui ne mérite pas de commentaire

- **Paraphraser** un nom de variable, de fonction ou de type. Si `toApiError` ou `requireSession` sont clairs, ne pas les réexpliquer.
- **Réécrire ce qu'une librairie documente déjà.** Si l'information est dans la doc publique ou dans l'infobulle de l'IDE, ne pas la recopier.
- Décrire une ligne qui **se lit d'elle-même**.

## Quand il est utile, il reste aussi court que son contenu l'exige

Un commentaire qui explique un **pourquoi** tient en une phrase. Ne jamais ajouter une deuxième ligne qui re-justifie ce que la première a déjà dit.

- ✗
  ```ts
  // On vérifie que la réponse est en échec avant de la convertir, parce que
  // sinon on convertirait aussi les réponses qui ont réussi, ce qui n'a pas
  // de sens puisqu'elles ne portent pas d'erreur.
  if (response.ok) return response
  ```
- ✓ `if (response.ok) return response` — la ligne se lit d'elle-même.

**L'exception, et elle est la raison d'être de cette section** : un commentaire qui porte un comportement relevé à la source d'une dépendance a le droit de décrire le mécanisme, sur plusieurs lignes s'il le faut. C'est le seul cas où la longueur se justifie, parce que le lecteur n'a aucun autre moyen de retrouver l'information.

- ✓
  ```ts
  // On intercepte la RÉPONSE, pas une exception : sur un email déjà pris, Better
  // Auth ne lève rien, il écrit lui-même son 422. Un try/catch autour du handler
  // ne verrait donc jamais ce cas.
  ```

Le test qui départage : est-ce que ces lignes racontent le code en dessous, ou est-ce qu'elles racontent quelque chose qui n'est écrit nulle part ? Dans le premier cas, couper. Dans le second, garder.

## Test avant d'écrire un commentaire

« Est-ce que quelqu'un qui connaît la stack comprend déjà le code sans ce commentaire ? » Si oui, ne pas l'écrire (ou le supprimer).
