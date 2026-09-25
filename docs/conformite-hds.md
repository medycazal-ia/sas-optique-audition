# Conformité données de santé — notes avant mise en production

> **Ceci n'est pas un avis juridique.** Ces notes cadrent la question
> technique pour préparer une décision à prendre avec un juriste/expert
> conformité avant toute mise en production réelle — voir "Prochaines
> étapes" dans `docs/dossier-cadrage.md`.

## Le bon cadre légal : HDS, pas "HIPAA"

HIPAA est une loi américaine — il n'existe pas d'équivalent portant ce nom
en Europe. Pour un dossier qui contient des données de santé (ordonnances,
type d'appareillage auditif, compte-rendu d'analyse), le cadre légal
applicable en France est la **certification HDS (Hébergeur de Données de
Santé)**, prévue par le code de la santé publique (article L.1111-8).

Point clé : **la certification HDS est portée par l'hébergeur, pas par le
code applicatif.** Ce dépôt peut être conçu pour être *compatible* avec un
hébergement HDS (voir ci-dessous), mais la certification elle-même
s'obtient en choisissant un hébergeur déjà certifié et en contractualisant
avec lui (le certificat couvre l'hébergeur, pas l'application qu'on y
déploie).

La liste officielle des hébergeurs certifiés est publiée par l'Agence du
Numérique en Santé (ANS) sur esante.gouv.fr — à vérifier directement plutôt
que de se fier à la réputation commerciale d'un hébergeur ("hébergement
sécurisé" ne veut pas dire "certifié HDS").

## Ce qui est déjà en place dans ce dépôt (compatible HDS)

- **Base de données via une seule variable d'environnement**
  (`DATABASE_URL`, format PostgreSQL standard) — migrer vers un PostgreSQL
  managé chez un hébergeur certifié HDS ne demande aucun changement de
  code, seulement de changer cette variable et de rejouer les migrations
  Prisma (`npx prisma migrate deploy`).
- **Authentification réelle** (`src/lib/auth.ts`, `middleware.ts`) : compte
  collaborateur (email + mot de passe, hash bcrypt), session signée en
  cookie httpOnly (JWT, 12h), `/dossiers/**` et `/api/dossiers/**`
  inaccessibles sans session valide. Premier compte créé via
  `/premiere-connexion` (endpoint qui se ferme dès qu'un compte existe).
  Le journal d'audit (`Evenement.acteur`) enregistre désormais l'email réel
  de l'utilisateur authentifié, plus une valeur libre non vérifiée.
- **Stockage de fichiers réel** (`src/lib/stockageFichiers.ts`) : les pièces
  téléversées (carte Vitale, ordonnance...) sont de vrais fichiers stockés
  et téléchargeables (`/api/dossiers/:id/documents/:documentId/telecharger`,
  protégé par la même authentification), pas seulement des métadonnées.
  L'adaptateur actuel écrit sur disque local (dev/démo) — un seul fichier à
  remplacer par un client S3-compatible pour basculer vers le stockage de
  l'hébergeur HDS, sans toucher au reste du code.
- **Avertissement chiffrement en transit** (`src/lib/prisma.ts`) : en
  production, un avertissement au démarrage si `DATABASE_URL` ne contient
  pas `sslmode=require` — pour ne pas oublier ce point au moment du
  changement d'hébergeur.
- **Journal d'audit systématique** (`Evenement`) : qui a fait quoi, quand,
  sur quelle entité — exigence typique d'un référentiel HDS (traçabilité
  des accès et modifications).
- **Consentements RGPD horodatés et modifiables** (`consentementEmail`,
  `consentementSms` + horodatage) sur l'entité `Personne`.
- **Validation humaine obligatoire** avant d'acter une synthèse générée par
  IA (`syntheseBesoinValideeA` / `syntheseBesoinValideePar`) — la
  validation est désormais liée au compte authentifié qui l'effectue,
  aucune décision automatique n'est actée silencieusement.

## Ce qui reste à faire avant la production

1. **Choisir un hébergeur certifié HDS** pour PostgreSQL et le stockage de
   documents (ex. Clever Cloud, Scaleway, OVHcloud Healthcare — à valider
   sur la liste officielle ANS, les offres et prix évoluent).
2. **Activer réellement le chiffrement en transit** : ajouter
   `?sslmode=require` à `DATABASE_URL` en production (l'avertissement au
   démarrage le rappelle, mais rien ne le fait automatiquement).
3. **Basculer le stockage de fichiers vers S3-compatible** chez l'hébergeur
   HDS retenu — `src/lib/stockageFichiers.ts` est le seul fichier à
   modifier (même signature de fonctions).
4. **Gestion des comptes** : pour l'instant, créer un compte au-delà du
   premier admin se fait uniquement en base (pas encore d'écran
   "inviter un collaborateur" ni de réinitialisation de mot de passe —
   acceptable pour une petite équipe en V1, à revoir si l'équipe grandit).
5. **Sauvegardes et plan de reprise** : à définir avec l'hébergeur retenu.
6. **Registre des traitements et analyse d'impact (AIPD/PIA)** RGPD — à
   mener avec un DPO/juriste, en particulier pour le mini-audit vocal
   (données de santé + enregistrement vocal).
7. **Contrat/DPA avec l'hébergeur** et, le cas échéant, avec les
   sous-traitants (transcription vocale, signature électronique, etc.
   mentionnés dans `docs/dossier-cadrage.md`).

Aucune donnée réelle de client ne devrait être saisie dans ce projet tant
que les points 1 à 3 ci-dessus ne sont pas réglés.
