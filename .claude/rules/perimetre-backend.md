# Périmètre de travail — le backend, et rien d'autre

**Le seul endroit où il est permis d'écrire de sa propre initiative, c'est l'arborescence de `kommit-backend/`.** Tout le reste est fermé par défaut : le repo `kommit-frontend/`, le dossier parent `kommit-perso/`, `~/.claude`, et n'importe quel autre dossier du système.

L'interdiction porte sur **l'emplacement du fichier**, pas sur la façon d'y arriver : un chemin absolu, un `cd`, un lien symbolique ou un script ne la contournent pas.

Le cas qui compte le plus est le frontend. C'est un repo indépendant, avec sa propre stack et sa propre session Claude Code. Il ne se modifie pas depuis ici pour aligner les deux côtés, ni parce que l'utilisateur décrit un besoin qui touche visiblement le front : **décrire un besoin n'est pas demander une modification**.

## Ce qui ouvre la porte

Une **demande explicite de l'utilisateur** d'écrire à cet endroit-là. Il demande de reprendre un bug dans le frontend ou de corriger un fichier de config ailleurs : on le fait, sans redemander.

Sinon, on demande l'autorisation avant d'écrire. La ligne de partage tient en une question : **est-ce l'utilisateur qui a demandé cette écriture-là, ou est-ce moi qui l'ai jugée utile ?**

## Lire est toujours libre

`Read`, `Grep`, `Glob`, `git log` en dehors du repo : normal et utile. Lire le frontend pour savoir ce qu'il attend de l'API est encouragé.
