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

## Comptes utilisateurs, rôles & Super Admin

Trois rôles, strictement hiérarchisés :

- **COLLABORATEUR** — accès comptoir courant (dossiers, produits, etc.).
- **DIRECTEUR** — tout ce qu'un collaborateur a, plus la carte
  **Utilisateurs** (`/utilisateurs`) : créer/éditer des comptes
  collaborateur/directeur, les activer/désactiver, et les bannir
  (`src/lib/utilisateurs.ts`). Un bannissement est **définitif** — pas de
  "débannir" : les données et l'historique du compte restent consultables,
  mais la connexion est perdue pour de bon.
- **SUPER_ADMIN** — au-dessus de tout, y compris des directeurs. Voit et
  gère absolument tous les comptes via la carte **Super Admin**
  (`/super-admin`), invisible et inaccessible (404) pour tout autre rôle —
  y compris à l'API. Ce rôle **ne s'attribue jamais depuis
  l'application** (aucune route ne l'accepte), par deux mécanismes
  volontairement indépendants et redondants :
  1. La variable d'environnement `SUPER_ADMIN_EMAILS` (liste d'emails
     séparés par des virgules), réglable uniquement depuis le tableau de
     bord Render — `sync: false` dans `render.yaml`, jamais commit dans le
     dépôt.
  2. Le rôle `SUPER_ADMIN` posé à la main en base, en accès direct SQL
     (ex. console Postgres de Render) — `UPDATE "Utilisateur" SET role =
     'SUPER_ADMIN' WHERE email = '...'`.

  Avoir les deux moyens d'accès (Render et accès direct base) garantit de
  ne jamais être bloqué si l'un des deux pose problème, et de pouvoir
  retrouver l'accès par l'un si l'autre est perdu.

## Correction du client (carte Fiche) et extraction OCR

La carte **Fiche** d'un dossier affiche la correction optique du client
(sphère/cylindre/axe/addition par œil), saisie à la main ou extraite
automatiquement d'un scan d'ordonnance (carte Santé) par IA de vision
(`src/lib/ocrOrdonnance.ts`) — un OCR classique n'est pas fiable sur de
l'écriture manuscrite variable. Toujours stockée en cylindre négatif
(convention des ophtalmologistes français) ; le cylindre positif (convention
verrier/opticien) est calculé à l'affichage, jamais stocké en double
(`src/lib/optique.ts`, formule vérifiée auprès de sources professionnelles).

Nécessite `ANTHROPIC_API_KEY` (clé personnelle à créer sur
[console.anthropic.com](https://console.anthropic.com), `sync: false` dans
`render.yaml`, jamais commit dans le dépôt) — sans elle, le bouton
"Extraire de l'ordonnance" échoue proprement avec un message d'erreur
clair, le reste de l'application n'est pas affecté. La saisie manuelle et
la correction d'une extraction restent toujours possibles sans cette clé.
Une valeur extraite est marquée « à vérifier » tant qu'un humain ne l'a
pas relue/corrigée au moins une fois.

L'OCR extrait aussi le cabinet, son numéro **FINESS** (9 chiffres — seul
numéro obligatoire pour qu'un cabinet entre dans l'annuaire) et le numéro
**RPPS** du praticien (11 chiffres, si présent sur l'ordonnance) — formats
vérifiés auprès de sources officielles. Un annuaire (`model Cabinet`,
`src/lib/cabinets.ts`) se construit au fur et à mesure des ordonnances
créées/corrigées (OCR ou saisie manuelle), et sert à l'autocomplétion
(`GET /api/cabinets?q=...`) en cas d'OCR défaillant ou de création
manuelle du dossier — plutôt que de tout retaper à chaque fois.

Un opticien peut adapter une prescription existante dans certaines limites
(décret du 27 mai 2016) : la carte Fiche permet de saisir cette adaptation
(ses propres mesures OD/OG, sa date, l'opticien) séparément de la
prescription du médecin — tant qu'elle existe, ce sont ses valeurs qui font
foi partout dans le logiciel (`lib/optique.ts` > `valeursActives`), la
prescription d'origine restant toujours consultable, jamais écrasée.

Le FINESS et le RPPS du prescripteur sont recopiés (instantané, jamais
recalculé) sur la demande de prise en charge dès qu'une proposition est
acceptée (carte Mutuelle & tiers payant) — une mutuelle les exige sur
toute demande de prise en charge.

## Conformité données de santé

**Important, à lire avant toute mise en production** :
[`docs/conformite-hds.md`](docs/conformite-hds.md).
