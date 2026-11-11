# Tests — Arrange, Act, Assert strict

Chaque test suit les trois phases **Arrange → Act → Assert**, séparées visuellement par une ligne vide, à chaque fois — y compris quand le test tiendrait sur une ligne.

- **Arrange** : préparer les données d'entrée (le `menu`, les produits, etc.).
- **Act** : appeler la fonction testée. Selon le cas, dans une variable dédiée ou directement dans le `expect` (voir la section ci-dessous).
- **Assert** : vérifier le résultat avec `expect(...)`.

## Inliner l'appel dans le `expect` : ça dépend de ce qu'on assert

La question « sortir l'appel dans un `const` ou l'imbriquer dans `expect(...)` » se tranche selon **ce que porte l'assertion**, pas selon un goût de style.

**Assertion sur la sortie de la fonction → on peut inliner.** Pour une fonction pure dont on teste la valeur de retour, `expect(fn(args)).toEqual(attendu)` est idiomatique et lisible. Pas besoin d'un `const result` intermédiaire.

- ✓ `expect(addProduct(menu, burger3)).toEqual(menuWithNewProductFirst)`
- ✓ dans un `test.each` : `expect(deleteProduct(menu, id)).toEqual(menuAfterDeletion)`

**Assertion sur l'entrée (test de non-mutation) → l'appel reste une ligne à part.** Ici on ne vérifie pas ce que la fonction renvoie, mais que le `menu` d'entrée est inchangé après l'appel. Imbriquer l'appel dans le `expect` change le sens du test (on se met à comparer le retour au lieu de l'entrée) et le fait passer à côté de son but.

- ✗ `expect(editProduct(menu, edited)).toEqual(originalMenu)` — teste le retour, plus la non-mutation
- ✓
  ```ts
  editProduct(menu, edited)

  expect(menu).toEqual(originalMenu)
  ```

Dans tous les cas, l'Arrange reste séparé par une ligne vide.

## Nommer les variables par leur contenu, pas par leur rôle

Interdit d'utiliser `result` ou `expected` **seuls** : ces mots ne disent rien de ce que la variable contient à cet endroit. Nommer d'après le contenu réel.

- ✗ `const result = deleteProduct(menu, id)`
- ✓ `const menuAfterDeletion = deleteProduct(menu, id)`
- ✓ `const menuWithNewProduct = addProduct(menu, burger3)`
- ✓ `const menuWithEditedProduct = editProduct(menu, edited)`

Pareil pour l'Arrange : `const emptyMenu: MenuProduct[] = []` plutôt que `menu` quand la vacuité est le point du test. Le nom doit permettre de lire le test sans relire la fonction testée.

### Exception : l'opérande attendu quand il partage le contenu du calcul

Le rôle (`expected`) n'est pas interdit **combiné au contenu**. Cas typique : le côté calculé et l'attendu décrivent la même chose. `deleteProduct(menu, id)` renvoie « le menu après suppression » — si on nomme l'attendu `menuAfterDeletion` aussi, plus rien ne dit lequel est la référence. On préfixe alors l'attendu par `expected` :

- ✗ `expect(menuAfterDeletion).toEqual(menuAfterDeletion)` — les deux côtés portent le même nom
- ✓ `expect(menuAfterDeletion).toEqual(expectedMenuAfterDeletion)`

Autrement dit : `expected` seul est interdit (il ne dit pas le contenu), mais `expected` + contenu est la bonne façon de marquer la référence quand le contenu seul serait ambigu.
