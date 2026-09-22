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

# Copier .env.example en .env et ajuster DATABASE_URL si besoin
cp .env.example .env

# Appliquer le schéma à la base
npx prisma migrate deploy   # ou `npx prisma migrate dev` en développement

npm run dev
```

Ouvrir [http://localhost:3000](http://localhost:3000).

## Structure

```
prisma/schema.prisma        Modèle de données (Lot 0 + Lot 1)
src/lib/prisma.ts           Client Prisma partagé
src/lib/evenements.ts       Journal d'audit (Événement)
src/lib/completude.ts       Calcul de complétude du dossier
src/app/dossiers/           UI module Dossier client
src/app/api/dossiers/       API du module Dossier client
docs/dossier-cadrage.md     Dossier de cadrage complet (spécification)
docs/conformite-hds.md      Notes de conformité données de santé (à lire avant la prod)
```

## Module Dossier client (Lot 1)

Implémente la Carte 1 du plan : état civil, coordonnées, rattachement
foyer/assuré, complétude des pièces, consentements RGPD horodatés, et
synthèse de besoin (mini-audit vocal) qui n'est jamais actée sans validation
humaine explicite. Chaque écriture significative est journalisée dans
l'entité `Evenement` (jamais de modification silencieuse).

Les autres modules du dossier de cadrage lisent ce module en lecture seule —
aucune information saisie ici ne doit être ressaisie ailleurs.

## Conformité données de santé

**Important, à lire avant toute mise en production** :
[`docs/conformite-hds.md`](docs/conformite-hds.md).
