# Déploiement d'une version démo sur Render

> **Pour démo uniquement.** Render (offre standard) n'est pas certifié HDS —
> ne pas y saisir de vraies données de client/patient. Voir
> `docs/conformite-hds.md` pour l'hébergement de production.

Je n'ai pas de compte Render ni d'accès à vos identifiants depuis cette
session — je ne peux donc pas déclencher ce déploiement moi-même. Le
fichier `render.yaml` à la racine du dépôt prépare tout pour que ce soit
rapide à faire de votre côté.

## Étapes

1. Aller sur [render.com](https://render.com) et se connecter (ou créer un
   compte).
2. **New → Blueprint**.
3. Connecter le dépôt GitHub `medycazal-ia/sas-optique-audition`, branche
   `main` (tous les lots réalisés y sont fusionnés).
4. Render détecte automatiquement `render.yaml` à la racine et propose de
   créer :
   - un **service web** (`sas-optique-audition`) qui build et lance
     l'application Next.js,
   - une **base PostgreSQL managée** (`sas-optique-audition-db`), déjà
     reliée au service web via la variable `DATABASE_URL`.
5. Valider — Render construit puis lance l'application. La migration
   Prisma (`prisma migrate deploy`) s'exécute automatiquement au démarrage,
   donc la base est prête sans étape manuelle.
6. Une URL de démo type `https://sas-optique-audition.onrender.com` est
   fournie à la fin du déploiement.

## Ce qui n'est pas couvert par ce blueprint

- **Conformité HDS** : cette configuration Render standard n'est pas
  certifiée pour héberger de vraies données de santé — voir
  `docs/conformite-hds.md` pour la marche à suivre avant toute mise en
  production réelle.
- **Authentification** : une vraie authentification existe (email + mot de
  passe), mais aucun compte n'existe au premier déploiement — passer par
  `/premiere-connexion` pour créer le tout premier compte collaborateur
  (cet endpoint se ferme dès qu'un compte existe).
- **Plan tarifaire** : les noms de plans dans `render.yaml` (`starter` pour
  le service web, `free` pour la base) peuvent changer chez Render —
  vérifier les tarifs/disponibilité actuels au moment du déploiement. La
  base en plan `free` est supprimée par Render après ~30 jours — passer à
  `basic-256mb` (payant) si la démo doit durer plus longtemps.

## Alternative sans compte à créer

Si vous préférez ne pas créer de compte Render tout de suite, l'application
tourne aussi en local avec `npm run dev` (voir `README.md`) — c'est ce que
j'utilise pour les captures d'écran envoyées dans la conversation.
