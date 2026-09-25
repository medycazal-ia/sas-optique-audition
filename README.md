# SAS métier — Optique & Audition

Logiciel métier qui pilote la relation client, la santé, la commande et la
finance d'un magasin d'optique et/ou d'audioprothèse, sur un dossier client
unique. Voir [`docs/dossier-cadrage.md`](docs/dossier-cadrage.md) pour le
dossier de cadrage complet (architecture, modèle de données, 9 modules,
découpage en lots).

**État actuel : Lot 0 (fondations) + Lot 1 (module Dossier client)
implémentés.** Les autres modules (Devis, Mutuelle, Commande, Facturation,
SAV, Pilotage, Automatisations) restent à réaliser dans les lots suivants.

## Stack technique

- [Next.js](https://nextjs.org) (App Router, TypeScript) — frontend + API routes dans un seul projet.
- [Prisma](https://www.prisma.io) — ORM et migrations.
- PostgreSQL.
- [Tailwind CSS](https://tailwindcss.com) — styles.

## Démarrage en local

Prérequis : Node.js 22+, PostgreSQL accessible (local ou distant).

```bash
npm install

# Copier .env.example en .env — ajuster DATABASE_URL, et générer un vrai
# SESSION_SECRET :
cp .env.example .env
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# → coller le résultat dans SESSION_SECRET de .env

# Appliquer le schéma à la base
npx prisma migrate deploy   # ou `npx prisma migrate dev` en développement

npm run dev
```

Ouvrir [http://localhost:3000](http://localhost:3000). Le module Dossier
client est protégé par authentification : la première visite sur
`/dossiers` redirige vers `/connexion` ; tant qu'aucun compte n'existe,
un lien y renvoie vers `/premiere-connexion` pour créer le premier compte
(administrateur). La page d'accueil (`/`) reste un hub public avec les 9
modules du dossier de cadrage sous forme de carrousel glissable — seul
**Dossier client** est fonctionnel, les 8 autres ouvrent une page d'aperçu
(objectif + périmètre) en attendant leur lot de réalisation.

## Déploiement d'une démo

Un blueprint [`render.yaml`](render.yaml) est prêt pour déployer une version
démo (app + base PostgreSQL managée) en quelques clics — voir
[`docs/deploiement-render.md`](docs/deploiement-render.md). Pour de vraies
données de client, voir d'abord `docs/conformite-hds.md`.

## Structure

```
prisma/schema.prisma           Modèle de données (Lot 0 + Lot 1 + comptes)
src/lib/prisma.ts              Client Prisma partagé
src/lib/auth.ts                Hash mot de passe, création/lecture de session
src/lib/session-edge.ts        Vérification de session compatible proxy (edge)
src/lib/stockageFichiers.ts    Stockage des documents (local en dev, à remplacer par S3 en prod)
src/lib/evenements.ts          Journal d'audit (Événement)
src/lib/completude.ts          Calcul de complétude du dossier
src/lib/modules.ts             Métadonnées des 9 modules (hub d'accueil)
src/components/Carrousel.tsx   Carrousel glissable réutilisable
src/proxy.ts                   Protection des routes /dossiers et /api/dossiers (auth)
src/app/                       Hub d'accueil + pages d'aperçu des modules
src/app/connexion/             Page de connexion
src/app/premiere-connexion/    Création du tout premier compte (admin)
src/app/dossiers/              UI module Dossier client
src/app/api/auth/              Connexion, déconnexion, amorçage du premier compte
src/app/api/dossiers/          API du module Dossier client
docs/dossier-cadrage.md        Dossier de cadrage complet (spécification)
docs/conformite-hds.md         Notes de conformité données de santé (à lire avant la prod)
docs/deploiement-render.md     Déployer une démo sur Render
```

## Module Dossier client (Lot 1)

Implémente la Carte 1 du plan : état civil, coordonnées, rattachement
foyer/assuré, complétude des pièces, consentements RGPD horodatés, et
synthèse de besoin (mini-audit vocal) qui n'est jamais actée sans validation
humaine explicite. Chaque écriture significative est journalisée dans
l'entité `Evenement` (jamais de modification silencieuse). Les cartes de la
fiche dossier se parcourent en carrousel glissable.

Les autres modules du dossier de cadrage lisent ce module en lecture seule —
aucune information saisie ici ne doit être ressaisie ailleurs.

## Conformité données de santé

**Important, à lire avant toute mise en production** :
[`docs/conformite-hds.md`](docs/conformite-hds.md).
