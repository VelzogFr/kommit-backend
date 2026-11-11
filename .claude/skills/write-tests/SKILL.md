---
name: write-tests
description: Écrit tous les tests d'un ticket AVANT l'implémentation, en orchestrant les subagents d'écriture selon l'inventaire produit par test-planner. Les lance en parallèle, une seule fois chacun, et seulement ceux qui ont du travail. N'écrit lui-même aucun test. Utiliser quand l'utilisateur dit "écris les tests", "test-first", "les tests du ticket", "étape 2".
---

## Entrée

- L'**inventaire des tests** du ticket : `testing/inventaire-<TICKET_ID>.md`, produit par `test-planner`. C'est lui qui décide quels writers ont du travail.
- Optionnel : un **périmètre restreint** (un paquet de règles métier précis). Sans précision, tout le ticket.

## Sortie

- Les **livrables des subagents lancés**, sur le disque — chacun décrit les siens dans sa propre définition.
- Un **rapport consolidé** rendu à l'utilisateur : ce qui a été écrit et où, l'état réel des tests unitaires (rouge attendu), et les points remontés par les agents.

Ce skill **n'écrit aucun test lui-même**. Il lit l'inventaire, décide qui lancer, délègue.

---

## Règles

- **Pas d'inventaire, pas de writers.** Si `testing/inventaire-<TICKET_ID>.md` n'existe pas, s'arrêter et demander à lancer `test-planner` d'abord — ne jamais trier les RM soi-même pour enchaîner. Le classement 🟢/🟠/🔴 commande tout l'aval et se relit avant d'être exécuté : c'est un point de contrôle, pas une étape à sauter.
- **Un seul lancement par agent**, jamais un par RM ni par paquet. Leurs fichiers sont des documents structurés (sections par paquet, ordre de l'inventaire) : une passe unique pose cette structure, des lancements répétés la font dériver.
- **En parallèle, dans un seul message.** Leurs périmètres d'écriture sont disjoints, donc c'est gratuit.
- **Ne pas lancer un agent qui n'a rien à faire.** Le récap de l'inventaire nomme le writer destinataire de chaque groupe de RM : si sa liste est vide, on ne le lance pas.
- **Transmettre le périmètre exact** (ticket entier ou paquet demandé) pour qu'aucun agent ne déborde.
- **Ne rien écrire soi-même**, même « juste un petit test » : tout passe par les agents, c'est ce qui garantit l'application de leurs conventions d'écriture.
- **Consolider les deux rapports** en un seul retour, sans recopier les tests ni les scénarios.
