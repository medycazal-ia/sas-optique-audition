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
- **Journal d'audit systématique** (`Evenement`) : qui a fait quoi, quand,
  sur quelle entité — exigence typique d'un référentiel HDS (traçabilité
  des accès et modifications).
- **Consentements RGPD horodatés et modifiables** (`consentementEmail`,
  `consentementSms` + horodatage) sur l'entité `Personne`.
- **Validation humaine obligatoire** avant d'acter une synthèse générée par
  IA (`syntheseBesoinValideeA` / `syntheseBesoinValideePar`) — aucune
  décision automatique n'est actée silencieusement.
- **Stockage de documents découplé** : `Document.cheminStockage` est une
  référence abstraite, pas un chemin de fichier local — brancher un
  stockage objet S3-compatible chez l'hébergeur HDS retenu est un
  changement localisé (un seul module d'accès aux fichiers à écrire),
  pas une refonte du schéma de données.

## Ce qui reste à faire avant la production

1. **Choisir un hébergeur certifié HDS** pour PostgreSQL et le stockage de
   documents (ex. Clever Cloud, Scaleway, OVHcloud Healthcare — à valider
   sur la liste officielle ANS, les offres et prix évoluent).
2. **Chiffrement** : chiffrement au repos (généralement fourni par
   l'hébergeur managé HDS) et en transit (TLS sur `DATABASE_URL`, à activer
   en ajoutant `?sslmode=require` en production).
3. **Authentification et contrôle d'accès** : ce Lot 1 n'implémente pas
   encore d'authentification utilisateur — indispensable avant toute donnée
   réelle de patient/client (actuellement, `acteur` dans le journal
   d'événements est une valeur libre, pas liée à un compte authentifié).
4. **Sauvegardes et plan de reprise** : à définir avec l'hébergeur retenu.
5. **Registre des traitements et analyse d'impact (AIPD/PIA)** RGPD — à
   mener avec un DPO/juriste, en particulier pour le mini-audit vocal
   (données de santé + enregistrement vocal).
6. **Contrat/DPA avec l'hébergeur** et, le cas échéant, avec les
   sous-traitants (transcription vocale, signature électronique, etc.
   mentionnés dans `docs/dossier-cadrage.md`).

Aucune donnée réelle de client ne devrait être saisie dans ce projet tant
que les points 1 à 4 ci-dessus ne sont pas réglés.
