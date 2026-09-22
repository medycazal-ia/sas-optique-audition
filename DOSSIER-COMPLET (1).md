# Dossier de cadrage complet — SAS métier Optique & Audition

> Compilation en un seul fichier de l'ensemble des propositions de projet
> produites le 22 septembre 2026, pour relecture ultérieure sans avoir à rouvrir
> chaque fichier séparément. Le détail par fichier reste disponible dans
> `/home/user/sas-optique-audition/` (README, PROJECT.md, `docs/`,
> `modules/`) — ce document en est la version fusionnée, dans l'ordre de
> lecture recommandé.

## Table des matières

1. [Vue d'ensemble](#vue-densemble)
2. [Proposition de projet](#proposition-de-projet)
3. [Architecture — colonne vertébrale & cartes spécialisées](#architecture--colonne-vertebrale--cartes-specialisees)
4. [Modèle de données](#modele-de-donnees)
5. [Parcours commun & principe d'interface](#parcours-commun--principe-dinterface)
6. [Annexe — plan source retranscrit](#annexe--plan-source-retranscrit)
7. [Module — Dossier client](#module--dossier-client)
8. [Module — Produits & catalogue](#module--produits--catalogue)
9. [Module — Devis & proposition](#module--devis--proposition)
10. [Module — Mutuelle & tiers payant](#module--mutuelle--tiers-payant)
11. [Module — Commande & livraison](#module--commande--livraison)
12. [Module — Facturation & financement](#module--facturation--financement)
13. [Module — SAV](#module--sav)
14. [Module — Pilotage](#module--pilotage)
15. [Module — Automatisations](#module--automatisations)

---

# Vue d'ensemble

*(source : `README.md`)*

# SAS métier — Optique & Audition

> Avant-projet : un logiciel métier qui pilote la relation client, la santé, la
> commande et la finance d'un magasin d'optique et/ou d'audioprothèse **de
> bout en bout**, sur un dossier client unique.

Ce dépôt formalise, en propositions de projet et en fichiers de cadrage par
module, le plan présenté dans "Avant-projet — SAS métier optique & audition"
(voir [`docs/plan-source.md`](docs/plan-source.md) pour le contenu d'origine
retranscrit). Aucun code d'application n'est encore écrit : c'est un dossier
de spécification, pensé pour être découpé en lots de réalisation.

## L'idée en une phrase

Une même relation client traverse l'accueil, les données de santé, la
prescription, le choix produit, la mutuelle, la commande, la livraison, le
SAV et l'encaissement — le logiciel doit relier chaque étape **sans ressaisie
ni perte de contexte**, avec un contrôle humain explicite partout où il
compte.

## Deux métiers, un même parcours

| | Optique | Audition |
|---|---|---|
| Point de départ | Ordonnance (prescription) | Analyse du besoin |
| Produit | Monture, verres, traitements, lentilles | Appareil auditif (par oreille), accessoires |
| Suivi | Adaptation, renouvellement | Réglages, usage, entretien, RDV de suivi |
| Point commun | Devis → prise en charge → commande → livraison → facturation → SAV | idem |

Les deux métiers partagent le **même parcours en 5 étapes** (voir
[`docs/parcours-commun.md`](docs/parcours-commun.md)) et le **même modèle de
dossier** (voir [`docs/modele-donnees.md`](docs/modele-donnees.md)) — seul le
contenu des cartes "produit" change.

## Les 9 modules proposés

| Module | Rôle | Dossier |
|---|---|---|
| **Dossier client** | Carte 1 : état civil, santé, préférences, mini-audit vocal | [`modules/dossier-client`](modules/dossier-client) |
| **Produits & catalogue** | Carte 2 : monture/verres/lentilles ou appareils, fournisseurs, stock | [`modules/produits-catalogue`](modules/produits-catalogue) |
| **Devis & proposition** | Composer, comparer, tracer la proposition commerciale | [`modules/devis-proposition`](modules/devis-proposition) |
| **Mutuelle & tiers payant** | Carte 3 : télétransmission, accords, rapprochements | [`modules/mutuelle-tiers-payant`](modules/mutuelle-tiers-payant) |
| **Commande & livraison** | Réception, contrôle, remise, ajustement | [`modules/commande-livraison`](modules/commande-livraison) |
| **Facturation & financement** | Encaissement, avoir, impayé, paiement fractionné | [`modules/facturation-financement`](modules/facturation-financement) |
| **SAV** | Incidents, garanties, retours, réactivation du dossier | [`modules/sav`](modules/sav) |
| **Pilotage** | Vues activité / économique / qualité, filtres magasin | [`modules/pilotage`](modules/pilotage) |
| **Automatisations** | Lecture mail, relances, synthèses — jamais décisionnaires | [`modules/automatisations`](modules/automatisations) |

Chaque module a son propre `README.md` : objectif, périmètre fonctionnel,
entités concernées, statuts/flux, intégrations nécessaires, écrans-cartes,
critères d'acceptation V1 et dépendances avec les autres modules.

## Documents de cadrage

- [`PROJECT.md`](PROJECT.md) — proposition de projet complète : objectifs,
  périmètre V1, découpage en lots, feuille de route, références du marché.
- [`docs/architecture.md`](docs/architecture.md) — la "colonne vertébrale
  métier" et les cartes spécialisées, logique d'intégrations.
- [`docs/modele-donnees.md`](docs/modele-donnees.md) — entités, relations,
  moteur de statuts.
- [`docs/parcours-commun.md`](docs/parcours-commun.md) — les 5 étapes du
  parcours et le principe d'"entonnoir inversé" de l'interface.
- [`docs/plan-source.md`](docs/plan-source.md) — retranscription fidèle du
  plan d'avant-projet fourni, pour traçabilité.

## Ce que ce dépôt n'est pas (encore)

Aucune stack technique (langage, framework, base de données) n'a été
choisie — ce n'est pas mentionné dans le plan d'origine, donc rien n'a été
présumé ici. C'est la première décision à prendre avant tout lot de
réalisation (voir "Prochaines étapes" dans `PROJECT.md`).

---

# Proposition de projet

*(source : `PROJECT.md`)*

# Proposition de projet — SAS métier Optique & Audition

## 1. Objectif

Construire un logiciel métier qui unifie, pour un magasin d'optique et/ou
d'audioprothèse, la relation client, le dossier de santé et la chaîne
financière — aujourd'hui typiquement éclatés entre plusieurs outils (fichier
client, devis papier/Excel, portails mutuelle séparés, facturation à part).

Le plan d'origine (`docs/plan-source.md`) pose un principe clair : **ce
n'est pas un écran de plus, c'est la continuité de bout en bout**, avec un
contrôle humain explicite partout où une décision compte (accord mutuelle,
validation d'une automatisation, etc.).

## 2. Pourquoi un découpage par module

Le plan décrit un système en "cartes" reliées à un dossier unique plutôt
qu'un monolithe. Réaliser le projet module par module permet :

- de livrer de la valeur dès le premier module (Dossier client) sans
  attendre l'ensemble ;
- de garder un périmètre clair par lot, avec des critères d'acceptation
  indépendants ;
- de commencer par l'optique et d'étendre à l'audition sans réécrire les
  cartes déjà faites (section 15 du plan).

## 3. Périmètre V1 proposé

**Métier** : optique uniquement pour la V1 (le plan recommande explicitement
ce séquencement). L'audition réutilise les mêmes cartes en V2.

**Modules inclus en V1** :
1. Dossier client (fondation — sans lui, rien d'autre ne peut être testé)
2. Produits & catalogue (version optique)
3. Devis & proposition
4. Mutuelle & tiers payant
5. Commande & livraison
6. Facturation & financement (hors financement/crédit, reporté en V1.1)
7. Pilotage (vue activité uniquement en V1 ; vues économique/qualité en V1.1)

**Modules reportés après V1** :
- SAV (dépend d'avoir des livraisons réelles en historique)
- Automatisations (dépend d'avoir des flux réels à automatiser — commencer
  par les observer avant de les automatiser)
- Financement/crédit dans Facturation (complexité réglementaire à cadrer à
  part)
- Extension Audition (V2, réutilisation du même modèle de dossier)

## 4. Découpage en lots

| Lot | Modules | Dépend de |
|---|---|---|
| **Lot 0 — Fondations** | Modèle de données transverse, moteur de statuts, journal d'événements | — |
| **Lot 1** | Dossier client | Lot 0 |
| **Lot 2** | Produits & catalogue (optique) | Lot 0 |
| **Lot 3** | Devis & proposition | Lots 1, 2 |
| **Lot 4** | Mutuelle & tiers payant | Lot 3 |
| **Lot 5** | Commande & livraison | Lot 3 (proposition acceptée) |
| **Lot 6** | Facturation (hors financement) | Lot 5 |
| **Lot 7** | Pilotage — vue activité | Lots 1 à 6 (lit les statuts) |
| **Lot 8 (V1.1)** | SAV, financement, vues économique/qualité du pilotage | Lots 1 à 7 |
| **Lot 9 (V2)** | Automatisations | Historique réel disponible |
| **Lot 10 (V2)** | Extension Audition | Modèle de dossier stabilisé |

## 5. Références du marché

Une analyse rapide de la documentation publique de **MyEasyOptic** (logiciel
de gestion pour opticiens, déjà répertorié dans la boîte à outils de Medy)
confirme la pertinence du découpage proposé et apporte du vocabulaire métier
réel à intégrer dans les spécifications détaillées :

- Organisation en onglets **Client** (annuaire, devis, ventes), **Tiers
  Payant** (télétransmissions, rapprochements) et **Stock** (articles,
  mouvements, multi-magasin) — proche du découpage Dossier client / Devis /
  Mutuelle / Produits proposé ici.
- Fonctions concrètes à reprendre dans les specs détaillées : devis
  normalisés, gestion "100% Santé", demandes de prise en charge
  électroniques avec réponse mutuelle rapide, blocage du calcul tiers payant
  si la mutuelle n'est pas renseignée, gestion multi-magasin du stock,
  signature électronique de devis, enrichissement SMS.
- Vocabulaire réglementaire/technique à respecter : télétransmission, SCOR,
  DRE (demande de remboursement électronique), APCV (carte Vitale), CPS
  (carte professionnelle de santé), 100% Santé.

Ce n'est pas une reprise à l'identique — le plan d'origine vise une
continuité de dossier plus poussée (santé + commerce + finance reliés) —
mais ce point de comparaison aide à ne pas sous-estimer la complexité
réglementaire du module Mutuelle & tiers payant en particulier (voir
`modules/mutuelle-tiers-payant/README.md`).

*(Le site n'a pas pu être directement analysé dans cet environnement —
domaine externe bloqué par le proxy réseau du sandbox — cette synthèse vient
d'une recherche web sur son contenu public indexé.)*

## 6. Prochaines étapes (pas encore tranchées ici)

Ce dossier de cadrage ne tranche volontairement pas ces points — à décider
avec Medy avant le premier lot de réalisation :

1. **Stack technique** : langage, framework front/back, base de données —
   rien n'était spécifié dans le plan d'origine.
2. **Hébergement** : réutiliser l'infrastructure déjà en place (Render,
   Supabase — voir la "boîte à outils" de medy.site) ou un choix dédié ?
3. **Conformité santé** : les données de santé (ordonnance, appareillage)
   impliquent probablement un hébergement HDS (Hébergeur de Données de
   Santé) en France — à valider avec un juriste/expert conformité avant
   la V1, pas après.
4. **Contenu exact des deux sections du plan dont le titre n'était pas
   lisible** dans la capture d'origine (Carte 3 "Mutuelle", et la section
   sur la facturation/financement) — reconstitué par déduction dans
   `docs/plan-source.md`, à faire valider par Medy.
5. **Confirmation du choix "optique d'abord"** avant de lancer le Lot 1.

---

# Architecture — colonne vertébrale & cartes spécialisées

*(source : `docs/architecture.md`)*

# Architecture proposée — colonne vertébrale + cartes spécialisées

> Source : section 15 du plan ("Le SAS proposé : une colonne vertébrale
> métier, des cartes spécialisées, un même dossier"). Ce document décrit
> l'architecture **fonctionnelle** ; aucun choix technique (langage,
> framework, hébergement, base de données) n'a été fait — voir
> "Prochaines étapes" dans `PROJECT.md`.

## Le principe

> "Une expérience moderne au comptoir, mais une architecture rigoureuse
> derrière."

```
                    ┌─────────────────────────────┐
                    │   Dossier client (unique)    │
                    │  Personne · Foyer · Assuré    │
                    └───────────────┬───────────────┘
                                    │
        ┌───────────────┬──────────┼──────────┬───────────────┐
        │               │          │          │               │
  ┌─────▼─────┐   ┌─────▼─────┐ ┌──▼───┐ ┌────▼─────┐  ┌──────▼──────┐
  │ Produits &│   │  Devis &  │ │Mutuelle│ Commande & │  │Facturation &│
  │ catalogue │   │proposition│ │& tiers │  livraison │  │ financement │
  │           │   │           │ │ payant │            │  │             │
  └───────────┘   └───────────┘ └──┬────┘ └────────────┘  └──────┬──────┘
                                    │                              │
                              ┌─────▼─────┐                  ┌────▼────┐
                              │    SAV    │                  │ Pilotage │
                              └───────────┘                  └─────────┘

              Automatisations : transverses à tous les modules
              (lecture mail, relances, synthèses — jamais décisionnaires)
```

Chaque module spécialisé lit et écrit dans le dossier client unique (voir
`modele-donnees.md`) plutôt que de tenir sa propre copie des données —
c'est ce qui garantit "sans ressaisie ni perte de contexte" (section 2 du
plan).

## Intégrations ouvertes nécessaires (section 15)

Le plan liste explicitement : catalogues, fournisseurs, portails de prise en
charge, messageries, paiement et comptabilité. En complément, une analyse
rapide de la documentation publique d'un logiciel du marché (MyEasyOptic —
voir "Références du marché" dans `PROJECT.md`) confirme des intégrations
attendues côté métier optique/audition :

| Catégorie | Exemples de flux attendus |
|---|---|
| **Catalogues fournisseurs** | Références monture/verre/lentille/appareil, tarifs, disponibilité |
| **Portails de prise en charge** | Télétransmission mutuelle, demandes d'accord électroniques (DRE), lecture carte Vitale (APCV), carte professionnelle de santé (CPS) |
| **Messageries** | Lecture boîte mail pour rapprocher réponses mutuelle/fournisseur (module Automatisations) |
| **Paiement** | Encaissement carte, paiement fractionné, simulation de financement |
| **Comptabilité** | Export factures/avoirs, rapprochement bancaire |
| **Communication client** | SMS, signature électronique de devis, consentement email |

## Séquencement recommandé (section 15, dernière puce)

> "Une première version peut commencer par le parcours optique, puis étendre
> les mêmes cartes à l'audition."

C'est la logique reprise dans `PROJECT.md` pour le découpage en lots : les
cartes (modules) sont pensées dès le départ pour être génériques, avec
l'optique comme premier terrain d'implémentation et l'audition comme
extension du même modèle plutôt qu'un second système.

---

# Modèle de données

*(source : `docs/modele-donnees.md`)*

# Modèle de données — vue d'ensemble

> Source : section 11 du plan ("Le modèle de données doit raconter toute la
> vie du dossier"). Ce document détaille les entités et leurs relations pour
> guider la conception de chaque module — ce n'est pas un schéma de base de
> données final (aucun SGBD/ORM n'a été choisi).

## Principe directeur

Un **dossier client unique** relie tout : santé, commerce, mutuelle,
commande, livraison, finance et service. Chaque module lit et écrit dans ce
même dossier plutôt que de dupliquer les données ailleurs. Un **moteur de
statuts et de tâches** rend visible le prochain geste au lieu de cacher la
complexité.

## Entités principales

| Entité | Description | Porté par le module |
|---|---|---|
| **Personne** | Identité, coordonnées, préférences de contact, consentements | Dossier client |
| **Foyer** | Regroupement de personnes (mutuelle famille, ayants droit) | Dossier client |
| **Assuré** | Rôle "assuré" vs "porteur"/bénéficiaire sur un contrat mutuelle | Dossier client, Mutuelle |
| **Ordonnance** | Prescription (optique) ou compte-rendu d'analyse (audition), renouvellement | Dossier client |
| **Document** | Pièce justificative : carte Vitale, mutuelle, ordonnance, devis signé, etc. | Dossier client (transverse) |
| **Proposition** | Version d'un devis, avec alternatives et choix final tracés | Devis & proposition |
| **Produit** | Article catalogue (monture, verre, lentille, appareil auditif, accessoire) | Produits & catalogue |
| **Stock** | Disponibilité d'un produit par magasin | Produits & catalogue |
| **Demande** | Demande de prise en charge / accord mutuelle | Mutuelle & tiers payant |
| **Commande** | Commande fournisseur liée à une proposition acceptée | Commande & livraison |
| **Livraison** | Réception, contrôle, remise au client, ajustement | Commande & livraison |
| **Facture** | Facture, avoir, échéancier | Facturation & financement |
| **Paiement** | Encaissement, acompte, impayé, relance | Facturation & financement |
| **Financement** | Paiement fractionné/mensualisé, simulation, accord de crédit | Facturation & financement |
| **SAV** | Incident, garantie, retour, réactivation du dossier | SAV |
| **Événement** | Entrée du journal : qui a fait quoi, quand, depuis quel canal, avec quelle preuve | Transverse (journal d'audit) |
| **Tâche** | Action à faire générée par le moteur de statuts (ex. "pièce manquante") | Transverse (automatisations, pilotage) |

## Relations clés

- Un **dossier** (= une Personne, ou un Foyer) peut contenir **plusieurs**
  Propositions, Documents, Demandes ou Événements dans le temps — l'historique
  n'est jamais écrasé.
- Une **Proposition** référence un ou plusieurs **Produits** réels (avec
  disponibilité **Stock** vérifiée avant promesse au client) et peut donner
  lieu à une **Demande** de prise en charge.
- Une **Commande** naît d'une Proposition acceptée ; une **Livraison** clôt
  une Commande et peut déclencher une **Facture**.
- Une **Facture** est liée à un ou plusieurs **Paiements**, éventuellement à
  un **Financement**.
- Un **SAV** référence la Livraison ou le Produit d'origine et peut
  rouvrir/réactiver le dossier (nouvelle Proposition, nouvelle Commande).
- Chaque écriture significative (création, changement de statut, document
  ajouté) génère un **Événement** journalisé — jamais de modification
  silencieuse.

## Moteur de statuts (principe, pas une implémentation figée)

Chaque entité "de flux" (Proposition, Demande, Commande, Livraison, Facture,
SAV) porte un statut explicite et un historique de transitions. Le rôle du
moteur : à tout moment, répondre à *"quel est le prochain geste, et qui doit
le faire ?"* — c'est ce que consomment le module **Pilotage** (vues
d'activité) et le module **Automatisations** (détection de blocages, relances).

Exemples de statuts à spécifier lot par lot (non figés ici) :
- Proposition : brouillon → envoyée → acceptée / refusée → expirée
- Demande (mutuelle) : à envoyer → envoyée → en attente → accord / refus
- Commande : à passer → passée → confirmée → reçue → contrôlée
- Livraison : programmée → remise → ajustement demandé → clôturée
- Facture : émise → payée partiellement → soldée → en impayé
- SAV : ouvert → diagnostiqué → en réparation/échange → clôturé

---

# Parcours commun & principe d'interface

*(source : `docs/parcours-commun.md`)*

# Parcours commun & principe d'interface

> Source : sections 5 et 6 du plan.

## Les 5 étapes, valables en optique comme en audition

1. **Qualifier** la personne et son besoin.
2. **Proposer** une solution adaptée au produit et au budget.
3. **Obtenir l'accord** — prises en charge et accords nécessaires (mutuelle,
   financement).
4. **Délivrer** — commander, réceptionner, contrôler, livrer.
5. **Suivre** — facturer, encaisser, garantir, réactiver le dossier si besoin
   (SAV, renouvellement).

Ces 5 étapes correspondent directement aux modules du dossier :

```
Qualifier  → Dossier client
Proposer   → Produits & catalogue + Devis & proposition
Accord     → Mutuelle & tiers payant (+ Facturation & financement pour le crédit)
Délivrer   → Commande & livraison
Suivre     → Facturation & financement + SAV
```

Le module **Pilotage** observe les 5 étapes en transverse (où sont les
dossiers, où sont les blocages) ; le module **Automatisations** agit en
transverse pour fluidifier le passage d'une étape à l'autre.

## Principe d'interface : l'entonnoir inversé

> "En surface : une fiche lisible et un prochain geste évident. En
> profondeur : données, documents, statuts, événements, acteurs, montants et
> preuves reliés."

Concrètement, pour chaque module :

- **Niveau 1 (comptoir)** : une carte simple, un statut clair, un bouton
  d'action évident ("Envoyer la demande mutuelle", "Contrôler la livraison").
- **Niveau 2 (détail)** : en ouvrant la carte, l'historique complet —
  documents liés, événements journalisés, montants, personnes impliquées.
- **Accès multiple** : chaque carte doit rester utilisable au clavier, au
  tactile (comptoir) ou à la voix (recherche, résumé, création de tâche —
  toujours avec validation explicite avant une action sensible).

## Modes de travail (section 12 du plan)

L'interface doit proposer des "modes" contextuels plutôt qu'un menu unique :

- Accueil rapide
- Rendez-vous conseil
- Back-office mutuelle
- Commande
- Facturation
- SAV
- Pilotage

Chaque mode met en avant les cartes et actions pertinentes pour la tâche en
cours, sans cacher l'accès aux autres modules (le dossier reste unique).

---

# Annexe — plan source retranscrit

*(source : `docs/plan-source.md`)*

# Plan source — "Avant-projet — SAS métier optique & audition"

Retranscription fidèle du plan fourni (capture d'écran d'un panneau de plan
Gamma), conservée ici pour traçabilité entre le brief d'origine et les
documents de cadrage de ce dépôt. Les titres numérotés correspondent aux
sections du plan d'origine ; l'ordre est celui du document source.

## 1. Un sas métier pour piloter l'optique et l'audition de bout en bout

## 2. Le produit doit absorber une vente, un dossier de santé et une chaîne financière en même temps
- Une même relation client traverse accueil, données personnelles,
  prescription, choix produit, mutuelle, commande, livraison, SAV et
  encaissement.
- Le défi n'est pas d'ajouter un écran de plus, mais de relier chaque étape
  sans ressaisie ni perte de contexte.

## 3. L'opticien transforme une prescription en solution portée, vendue, livrée et suivie
- Accueil et découverte du besoin, lecture de l'ordonnance, conseil monture,
  verres ou lentilles, prise de mesures et adaptation.
- Devis, choix du produit, vérification de la prise en charge, commande,
  contrôle, remise, ajustement et SAV.
- Le logiciel doit relier le conseil de santé, le produit exact et le
  dossier financier.
- La prescription et les règles de renouvellement conditionnent le parcours
  de lunettes et lentilles.

## 4. L'audioprothésiste suit un appareillage, pas seulement une vente d'appareil
- Analyse du besoin, proposition de solution, choix de l'appareil,
  adaptation, réglages, suivi d'usage et entretien.
- Le devis doit distinguer appareil, prestations d'adaptation, marque,
  modèle, référence, garantie, accessoires, total et prise en charge.
- Le parcours doit gérer les deux oreilles, les rendez-vous de suivi, les
  accessoires et les incidents dans la durée.

## 5. Le parcours commun : comprendre, proposer, obtenir l'accord, délivrer, suivre
1. Qualifier la personne et son besoin.
2. Construire une proposition adaptée au produit et au budget.
3. Obtenir les prises en charge et accords nécessaires.
4. Commander, réceptionner, contrôler et livrer.
5. Facturer, encaisser, garantir et réactiver le dossier.

## 6. L'interface se lit comme un entonnoir inversé : une carte simple devient un système complet
- En surface : une fiche lisible et un prochain geste évident.
- En profondeur : données, documents, statuts, événements, acteurs, montants
  et preuves reliés.
- Chaque carte doit pouvoir être ouverte au comptoir, au clavier, au tactile
  ou à la voix.

## 7. Carte 1 — établir le dossier client sans ralentir l'accueil
- État civil, coordonnées, personne assurée, porteur, préférences de contact
  et consentements à cadrer.
- Collecte guidée : carte Vitale, carte de mutuelle, ordonnance, historique,
  justificatifs et pièces utiles.
- Mini-audit vocal enregistré : habitudes, gêne, usage, attentes, budget,
  urgence et contexte de vie.
- L'IA transforme l'entretien en synthèse, points d'attention et questions
  manquantes, avec validation humaine.

## 8. Carte 2 — composer la proposition commerciale autour d'un produit réel
- Optique : monture, verres, traitements, mesures, lentilles, accessoires,
  garantie et services.
- Audition : oreille, appareil, gamme, adaptation, accessoires, suivi et
  garantie.
- Connexion au catalogue fournisseurs, aux tarifs et au stock disponible
  avant toute promesse.
- Le devis garde la trace de la proposition, des alternatives et du choix
  final du client.

## 9. Carte 3 — faire de la mutuelle un flux suivi, pas un aller-retour de mails
*(titre reconstitué à partir de la position dans le plan et du thème des
sections voisines — le contenu détaillé de cette carte n'était pas lisible
dans la capture fournie ; à valider avec Medy avant réalisation.)*

## 10. Facturer, encaisser et financer sans perdre le lien client
*(titre reconstitué — le haut de cette section était coupé dans la capture)*
- Gérer acompte, encaissement, facture, avoir, impayé, relance et clôture.
- Prévoir le financement : paiement fractionné, mensualisé, simulation,
  justificatifs, accord et échéancier.
- Le conseiller peut devenir intermédiaire d'un parcours de crédit : droits,
  responsabilités et validation doivent être explicités.

## 11. Le modèle de données doit raconter toute la vie du dossier
- Entités : personne, foyer, assuré, ordonnance, document, proposition,
  produit, stock, demande, commande, livraison, facture, paiement,
  financement, SAV.
- Relations : un dossier peut contenir plusieurs propositions, documents,
  demandes ou événements.
- Journaliser qui a fait quoi, quand, depuis quel canal et avec quelle pièce
  justificative.
- Un moteur de statuts et de tâches rend visible le prochain geste au lieu
  de cacher la complexité.

## 12. Le comptoir devient une surface de travail tactile, guidée et conversationnelle
- Cartes déplaçables, étapes visibles, gros boutons d'action, pièces jointes
  accessibles et alertes compréhensibles.
- Modes adaptés : accueil rapide, rendez-vous conseil, back-office mutuelle,
  commande, facturation, SAV et pilotage.
- Voix pour rechercher, résumer, créer une tâche ou afficher une
  proposition ; validation explicite avant toute action sensible.
- Liens et aperçus externes pour catalogues, portails, documents et
  démonstrations client.

## 13. Les automatisations doivent supprimer les tâches répétitives, pas décider à la place du professionnel
- Lire les boîtes mail, extraire les références, rapprocher une réponse
  d'une demande et proposer le bon statut.
- Détecter pièce manquante, délai dépassé, commande bloquée, réponse
  incohérente ou reste à charge inattendu.
- Préparer synthèse vocale, compte rendu, relance, proposition et checklist
  de livraison.
- Conserver une boîte de validation humaine, une trace et une possibilité de
  correction.

## 14. Le pilotage transforme les dossiers en décisions magasin
- Vue activité : dossiers ouverts, demandes en attente, commandes en
  retard, livraisons du jour et SAV à traiter.
- Vue économique : chiffre d'affaires, marge, reste à charge, tiers payant,
  impayés et financement.
- Vue qualité : délais, pièces manquantes, retours, garanties et
  satisfaction.
- Filtres par magasin, collaborateur, activité, période et fournisseur et
  statut.

## 15. Le SAS proposé : une colonne vertébrale métier, des cartes spécialisées, un même dossier
- Une expérience moderne au comptoir, mais une architecture rigoureuse
  derrière.
- Un dossier unique qui relie santé, commerce, mutuelle, commande,
  livraison, finance et service.
- Des intégrations ouvertes vers catalogues, fournisseurs, portails de prise
  en charge, messageries, paiement et comptabilité.
- Une première version peut commencer par le parcours optique, puis étendre
  les mêmes cartes à l'audition.

## 16. Conclusion — rendre visible chaque prochaine action et fiable chaque information
- Le logiciel doit faire gagner du temps, sécuriser le dossier et améliorer
  l'expérience du client.
- La promesse n'est pas l'automatisation partout : c'est la continuité de
  bout en bout, avec contrôle humain là où il compte.
- Étape suivante : transformer ces cartes en spécifications fonctionnelles,
  écrans, règles de pilotage magasin et connecteurs.

---

**Note de fidélité** : la capture d'écran fournie montrait un panneau de
plan Gamma partiellement scrollé, avec deux sections dont le titre exact
n'était pas visible (repérées ci-dessus). Le contenu de leurs puces était
lisible et a été retranscrit tel quel ; seuls les titres ont été
reconstitués par déduction contextuelle — à confirmer avec Medy plutôt qu'à
prendre pour argent comptant.

---

# Module — Dossier client

*(source : `modules/dossier-client/README.md`)*

# Module — Dossier client

> Carte 1 du plan : "établir le dossier client sans ralentir l'accueil"
> (`docs/plan-source.md`, section 7). Module fondation — tous les autres en
> dépendent.

## Objectif

Capturer, dès l'accueil, tout ce qui identifie la personne, son foyer, ses
droits (assuré/porteur) et son besoin réel — sans ralentir l'échange au
comptoir, et sans faire ressaisir une information déjà connue plus tard dans
le parcours.

## Périmètre fonctionnel

- **État civil & coordonnées** : identité, contact, préférences de contact,
  consentements (email, SMS) à cadrer explicitement (RGPD).
- **Rattachement foyer/assuré** : distinguer la personne assurée du
  porteur/bénéficiaire (cas des mutuelles familiales).
- **Collecte guidée de pièces** : carte Vitale, carte de mutuelle,
  ordonnance, historique, justificatifs — un parcours qui indique la pièce
  suivante à fournir plutôt qu'un formulaire libre.
- **Mini-audit vocal** : entretien enregistré (habitudes, gêne, usage,
  attentes, budget, urgence, contexte de vie), transformé par l'IA en
  synthèse + points d'attention + questions manquantes, **toujours validée
  par un humain avant d'être actée dans le dossier**.

## Entités concernées

`Personne`, `Foyer`, `Assuré`, `Ordonnance`, `Document`, `Événement` — voir
`docs/modele-donnees.md`.

## Statuts / flux clés

Un dossier client n'a pas de "statut" au sens flux de vente — c'est le socle
permanent. Ce qui varie : la **complétude** (pièces manquantes) et la
**fraîcheur** (ordonnance périmée, mutuelle à revalider) — deux signaux que
consomme le module Pilotage et que le module Automatisations peut détecter.

## Intégrations nécessaires

- Lecture carte Vitale (APCV) — cf. `docs/architecture.md`.
- Lecteur/scanner de documents (carte mutuelle, ordonnance papier).
- Service de transcription vocale pour le mini-audit (déjà utilisé côté
  medy.site via ElevenLabs — à évaluer comme réutilisation possible).

## Écrans / cartes UI

- **Carte "Nouveau dossier"** : accueil rapide, identité + contact minimum
  pour démarrer, complété ensuite.
- **Carte "Complétude du dossier"** : liste des pièces obtenues / manquantes,
  bouton d'action évident par pièce manquante.
- **Carte "Synthèse besoin"** : résultat de l'audit vocal, éditable, avec un
  bouton de validation humaine explicite avant enregistrement définitif.

## Critères d'acceptation V1

- [ ] Un dossier peut être créé en moins de 2 minutes au comptoir avec le
      strict minimum (identité + contact).
- [ ] Aucune information saisie ici ne doit être ressaisie dans les modules
      Devis, Mutuelle ou Facturation (accessible en lecture depuis ces
      modules).
- [ ] La synthèse générée par IA n'est jamais enregistrée sans validation
      humaine explicite.
- [ ] Consentements (email/SMS) stockés avec horodatage et modifiables à
      tout moment par le client.

## Dépendances avec les autres modules

- **Produits & catalogue**, **Devis & proposition** : lisent l'identité et
  la synthèse besoin pour construire une proposition pertinente.
- **Mutuelle & tiers payant** : lit les infos Assuré/Foyer et la carte
  mutuelle collectée ici.
- **Pilotage** : consomme le signal de complétude du dossier.

---

# Module — Produits & catalogue

*(source : `modules/produits-catalogue/README.md`)*

# Module — Produits & catalogue

> Carte 2 du plan : "composer la proposition commerciale autour d'un produit
> réel" (`docs/plan-source.md`, section 8).

## Objectif

Donner accès, au moment de composer une proposition, à des produits **réels
et disponibles** — jamais à une promesse théorique déconnectée du stock ou
du tarif fournisseur du jour.

## Périmètre fonctionnel

**Optique (V1)** :
- Monture (référence, marque, disponibilité)
- Verres (type, traitements, mesures nécessaires)
- Lentilles (type, quantité, renouvellement)
- Accessoires, garantie, services associés

**Audition (V2 — mêmes cartes, contenu différent)** :
- Appareil (par oreille, gamme, marque, modèle, référence)
- Prestations d'adaptation, accessoires, garantie

**Transverse** :
- Connexion catalogue fournisseurs (référence, tarif)
- Stock disponible par magasin (multi-magasin, cf. référence marché
  MyEasyOptic dans `PROJECT.md`)
- Historique de prix (traçabilité en cas de litige)

## Entités concernées

`Produit`, `Stock` — voir `docs/modele-donnees.md`.

## Statuts / flux clés

- Produit : actif / en rupture / discontinué chez le fournisseur.
- Stock : disponible / réservé (proposition en cours) / commandé.

## Intégrations nécessaires

- Flux catalogue fournisseurs (référence + tarif — format à définir par
  fournisseur, probablement EDI ou API selon le partenaire).
- Synchronisation stock multi-magasin.

## Écrans / cartes UI

- **Carte "Recherche produit"** : filtrage par type, marque, disponibilité
  immédiate.
- **Carte "Fiche produit"** : détail, prix, stock par magasin, historique.

## Critères d'acceptation V1

- [ ] Aucun produit ne peut être ajouté à une proposition sans vérification
      de disponibilité (stock ou délai fournisseur affiché).
- [ ] Le tarif affiché au client est toujours le tarif en vigueur au moment
      de la proposition (pas de valeur mise en cache périmée).
- [ ] La disponibilité multi-magasin est consultable avant de promettre un
      délai au client.

## Dépendances avec les autres modules

- **Devis & proposition** : consomme ce catalogue pour composer une
  proposition.
- **Commande & livraison** : déclenche la commande fournisseur à partir
  d'une référence produit ici définie.
- **Pilotage** : vue qualité (ruptures, délais fournisseurs).

---

# Module — Devis & proposition

*(source : `modules/devis-proposition/README.md`)*

# Module — Devis & proposition

> Croise les cartes 1 et 2 du plan : le dossier client (besoin) et le
> catalogue (produit réel), pour produire une proposition tracée.

## Objectif

Composer une proposition commerciale adaptée au besoin et au budget, en
gardant la trace de **toutes** les versions, alternatives et du choix final
— jamais un simple document qui écrase le précédent.

## Périmètre fonctionnel

- Génération d'un devis à partir du besoin (Dossier client) et d'un ou
  plusieurs produits (Produits & catalogue).
- Gestion de **plusieurs propositions** en parallèle pour un même dossier
  (comparaison d'options, budgets différents).
- Devis normalisé pour les cas réglementés (ex. "100% Santé" côté optique —
  vocabulaire confirmé par la référence marché MyEasyOptic).
- Signature électronique du devis retenu.
- Historique complet : versions, alternatives proposées, choix final,
  horodatage.

## Entités concernées

`Proposition`, `Produit` (lecture), `Document` (devis signé) — voir
`docs/modele-donnees.md`.

## Statuts / flux clés

`brouillon → envoyée → acceptée / refusée → expirée`

Une proposition acceptée est le déclencheur du module **Mutuelle & tiers
payant** (demande d'accord) et, une fois l'accord obtenu, du module
**Commande & livraison**.

## Intégrations nécessaires

- Service de signature électronique.
- Génération de devis normalisé conforme à la réglementation en vigueur
  (100% Santé notamment) — à spécifier avec un expert métier avant
  réalisation, les règles évoluent.

## Écrans / cartes UI

- **Carte "Composer une proposition"** : sélection produit(s), calcul du
  reste à charge estimé (avant confirmation mutuelle).
- **Carte "Comparer les options"** : plusieurs propositions côte à côte pour
  un même dossier.
- **Carte "Suivi de la proposition"** : statut, relance si sans réponse.

## Critères d'acceptation V1

- [ ] Une proposition refusée ou remplacée reste consultable dans
      l'historique du dossier (jamais supprimée).
- [ ] Le devis généré respecte le format normalisé quand le cas réglementé
      s'applique (100% Santé).
- [ ] Le passage au statut "acceptée" déclenche automatiquement une tâche
      visible côté Mutuelle & tiers payant.

## Dépendances avec les autres modules

- **Dossier client**, **Produits & catalogue** : sources de données pour
  composer la proposition.
- **Mutuelle & tiers payant** : consomme la proposition acceptée.
- **Commande & livraison** : consomme la proposition + l'accord mutuelle.

---

# Module — Mutuelle & tiers payant

*(source : `modules/mutuelle-tiers-payant/README.md`)*

# Module — Mutuelle & tiers payant

> Carte 3 du plan (titre et détail reconstitués — non lisibles dans la
> capture d'origine, voir la note de fidélité dans `docs/plan-source.md`) :
> faire de la mutuelle un flux suivi, pas un aller-retour de mails.
> **À faire valider par Medy avant réalisation**, c'est le module le plus
> reconstitué de tout ce dossier.

## Objectif

Remplacer les échanges manuels par mail/téléphone avec les mutuelles par un
**flux suivi et tracé** : demande d'accord, réponse, rapprochement avec la
proposition, et blocage explicite si une information manque — plutôt qu'une
découverte du problème à l'encaissement.

## Périmètre fonctionnel

D'après la référence marché (MyEasyOptic, voir `PROJECT.md`), les fonctions
attendues sur ce module incluent typiquement :

- Télétransmission des demandes de prise en charge.
- Demande d'accord électronique (DRE) avec réponse mutuelle rapide.
- Rapprochement automatique entre une réponse reçue et la demande
  correspondante.
- **Blocage explicite** du calcul de reste à charge si la mutuelle n'est pas
  renseignée sur le dossier (évite une promesse de prix fausse au client).
- Référentiel des mutuelles conventionnées, mis à jour régulièrement.
- Lien avec la carte professionnelle de santé (CPS) côté professionnel.

## Entités concernées

`Demande`, `Assuré`, `Proposition` (lecture) — voir `docs/modele-donnees.md`.

## Statuts / flux clés

`à envoyer → envoyée → en attente → accord / refus`

Un accord met à jour le reste à charge réel de la Proposition ; un refus ou
une absence de réponse après délai génère une tâche visible (Pilotage,
Automatisations).

## Intégrations nécessaires

- Portail(s) de télétransmission mutuelle (probablement via un tiers de
  confiance du secteur — à identifier, hors périmètre de ce document).
- Lecture carte Vitale (APCV) et carte professionnelle de santé (CPS).
- Référentiel mutuelles conventionnées (mise à jour périodique).

## Écrans / cartes UI

- **Carte "Demandes en cours"** : liste des demandes envoyées, statut, délai
  écoulé.
- **Carte "Réponse reçue"** : rapprochement avec la demande, mise à jour du
  reste à charge.
- **Alerte "Mutuelle manquante"** : bloque le calcul tant que l'information
  n'est pas complétée dans le Dossier client.

## Critères d'acceptation V1

- [ ] Aucun reste à charge n'est communiqué au client sans mutuelle
      renseignée et vérifiée (ou refus explicite du client de la
      renseigner, tracé comme tel).
- [ ] Chaque demande envoyée est visible avec son statut et son délai — pas
      de demande "perdue" faute de suivi.
- [ ] Une réponse reçue se rapproche automatiquement de la bonne demande
      (pas de traitement manuel dossier par dossier si évitable).

## Dépendances avec les autres modules

- **Devis & proposition** : déclenche ce module à l'acceptation.
- **Facturation & financement** : le reste à charge final vient d'ici.
- **Automatisations** : peut proposer un rapprochement quand la réponse
  arrive par email plutôt que par le portail dédié (à spécifier).

## Point d'attention pour la suite

Ce module touche à des flux réglementés et à des tiers externes (mutuelles,
portails de télétransmission) — **la faisabilité technique réelle
(disponibilité d'API, coûts d'accès, délais d'intégration par mutuelle)
n'a pas été vérifiée dans ce document** et doit être étudiée avant tout
engagement de réalisation sur ce module.

---

# Module — Commande & livraison

*(source : `modules/commande-livraison/README.md`)*

# Module — Commande & livraison

> Étape 4 du parcours commun : "commander, réceptionner, contrôler et
> livrer" (`docs/plan-source.md`, section 5).

## Objectif

Faire exister, une fois une proposition acceptée (et l'accord mutuelle
obtenu quand nécessaire), une chaîne commande → réception → contrôle →
remise au client → ajustement, sans perte d'information entre chaque étape.

## Périmètre fonctionnel

- Passage de commande fournisseur à partir d'une proposition acceptée.
- Suivi du statut de commande (passée, confirmée, en fabrication/transit).
- Réception et contrôle qualité à l'arrivée.
- Remise au client, avec ajustement (monture) ou réglage (appareil auditif)
  si nécessaire à ce moment.
- Traçabilité : quelle commande correspond à quelle proposition, quel
  produit exact a été livré (numéro de série pour les appareils auditifs).

## Entités concernées

`Commande`, `Livraison`, `Produit` (lecture) — voir `docs/modele-donnees.md`.

## Statuts / flux clés

- Commande : `à passer → passée → confirmée → reçue → contrôlée`
- Livraison : `programmée → remise → ajustement demandé → clôturée`

## Intégrations nécessaires

- Flux de commande fournisseur (format à définir par fournisseur).
- Suivi logistique (transporteur) si disponible côté fournisseur.

## Écrans / cartes UI

- **Carte "Commandes en cours"** : vue par statut, alertes sur délai
  dépassé.
- **Carte "Réception"** : checklist de contrôle avant mise en rayon/remise
  client.
- **Carte "Remise client"** : programmation du rendez-vous de remise,
  ajustement noté et tracé.

## Critères d'acceptation V1

- [ ] Aucune commande ne peut être passée sans proposition acceptée liée
      (traçabilité complète).
- [ ] Un ajustement fait au moment de la remise est enregistré dans le
      dossier (utile pour le SAV futur).
- [ ] Un délai dépassé génère une alerte visible (Pilotage) sans action
      manuelle de recherche.

## Dépendances avec les autres modules

- **Devis & proposition**, **Mutuelle & tiers payant** : déclenchent ce
  module.
- **Facturation & financement** : la livraison clôturée peut déclencher la
  facturation finale.
- **SAV** : référence la livraison d'origine en cas d'incident ultérieur.

---

# Module — Facturation & financement

*(source : `modules/facturation-financement/README.md`)*

# Module — Facturation & financement

> Étape 5 du parcours commun ("facturer, encaisser, garantir et réactiver le
> dossier") et section 10 du plan (titre reconstitué — voir la note de
> fidélité dans `docs/plan-source.md`).

## Objectif

Solder financièrement un dossier — acompte, encaissement, facture, avoir,
impayé, relance — sans perdre le lien avec le client ni avec le reste du
dossier (proposition, mutuelle, livraison).

## Périmètre fonctionnel

**V1 (hors financement/crédit)** :
- Émission de facture à partir d'une livraison clôturée.
- Gestion d'acompte, encaissement, avoir.
- Suivi des impayés et relances.
- Rapprochement avec le reste à charge validé par le module Mutuelle.

**V1.1 (financement)** :
- Paiement fractionné / mensualisé.
- Simulation de financement, pièces justificatives, accord, échéancier.
- Cas où le conseiller devient intermédiaire d'un parcours de crédit :
  droits, responsabilités et étapes de validation à expliciter clairement
  (cadre réglementaire du crédit à la consommation à valider avec un
  juriste avant réalisation — non traité dans ce document).

## Entités concernées

`Facture`, `Paiement`, `Financement` — voir `docs/modele-donnees.md`.

## Statuts / flux clés

- Facture : `émise → payée partiellement → soldée → en impayé`
- Paiement : chaque encaissement est un événement daté, jamais une simple
  mise à jour d'un solde.

## Intégrations nécessaires

- Terminal de paiement / encaissement.
- Export comptabilité.
- (V1.1) Partenaire de financement/crédit à la consommation.

## Écrans / cartes UI

- **Carte "Facturer"** : à partir d'une livraison clôturée, montant déjà
  calculé (proposition + mutuelle), pas de ressaisie.
- **Carte "Impayés"** : liste triée par ancienneté, relance en un geste.
- (V1.1) **Carte "Financement"** : simulation, pièces, accord, échéancier.

## Critères d'acceptation V1

- [ ] Une facture reprend automatiquement le reste à charge validé par le
      module Mutuelle — aucun recalcul manuel.
- [ ] Un impayé après délai génère une tâche de relance visible (Pilotage,
      Automatisations).
- [ ] Un avoir reste lié à la facture d'origine (jamais un document
      indépendant).

## Dépendances avec les autres modules

- **Commande & livraison** : déclenche la facturation.
- **Mutuelle & tiers payant** : source du reste à charge.
- **Pilotage** : vue économique (chiffre d'affaires, marge, impayés).
- **SAV** : un avoir/retour peut naître d'un SAV.

---

# Module — SAV

*(source : `modules/sav/README.md`)*

# Module — SAV

> Étape 5 du parcours commun : "garantir et réactiver le dossier"
> (`docs/plan-source.md`, section 5). Reporté après la V1 (voir `PROJECT.md`
> — dépend d'un historique réel de livraisons).

## Objectif

Traiter un incident après livraison (casse, gêne, panne d'appareil auditif,
retour) en le rattachant au dossier et à la livraison d'origine, plutôt que
comme un nouveau dossier déconnecté.

## Périmètre fonctionnel

- Ouverture d'un SAV depuis le dossier client existant (jamais depuis zéro).
- Diagnostic, décision (réparation, échange, remboursement).
- Gestion de garantie (constructeur, magasin).
- Réactivation du dossier : un SAV peut redonner lieu à une nouvelle
  proposition ou commande.

## Entités concernées

`SAV`, référencie `Livraison` et `Produit` — voir `docs/modele-donnees.md`.

## Statuts / flux clés

`ouvert → diagnostiqué → en réparation/échange → clôturé`

## Intégrations nécessaires

- Suivi garantie fournisseur (durée, conditions par produit).
- (optionnel) Envoi/suivi logistique si réparation externalisée.

## Écrans / cartes UI

- **Carte "Ouvrir un SAV"** : accessible directement depuis la fiche
  Livraison ou Produit du dossier.
- **Carte "Suivi SAV"** : statut, délai, décision.

## Critères d'acceptation V1 (quand ce module sera réalisé)

- [ ] Un SAV référence toujours une Livraison ou un Produit existant du
      dossier (pas de saisie libre déconnectée).
- [ ] Une garantie expirée est signalée avant toute promesse de prise en
      charge gratuite.
- [ ] Un SAV clôturé par un échange déclenche automatiquement une nouvelle
      Commande si nécessaire.

## Dépendances avec les autres modules

- **Commande & livraison** : source de la Livraison d'origine.
- **Facturation & financement** : un avoir peut naître d'un SAV.
- **Pilotage** : vue qualité (taux de retour, délais SAV).

---

# Module — Pilotage

*(source : `modules/pilotage/README.md`)*

# Module — Pilotage

> Section 14 du plan : "le pilotage transforme les dossiers en décisions
> magasin".

## Objectif

Donner une vue transverse sur tous les dossiers en cours, pour transformer
des dossiers individuels en décisions de gestion au niveau du magasin (ou du
réseau de magasins).

## Périmètre fonctionnel

**V1 — vue activité uniquement** :
- Dossiers ouverts, demandes en attente, commandes en retard, livraisons du
  jour, SAV à traiter.

**V1.1 — vues économique et qualité** :
- Économique : chiffre d'affaires, marge, reste à charge, tiers payant,
  impayés, financement.
- Qualité : délais, pièces manquantes, retours, garanties, satisfaction.

**Transverse** :
- Filtres par magasin, collaborateur, activité, période, fournisseur,
  statut.

## Entités concernées

Lit en transverse `Événement`, et les statuts de `Proposition`, `Demande`,
`Commande`, `Livraison`, `Facture`, `SAV` — voir `docs/modele-donnees.md`.
Ne possède pas ses propres entités : c'est une couche de lecture/agrégation.

## Statuts / flux clés

N/A — ce module observe les statuts des autres modules, il n'en introduit
pas de nouveaux.

## Intégrations nécessaires

Aucune externe en V1 — dépend uniquement des données déjà présentes dans les
autres modules. Un export vers un outil de BI externe peut être envisagé
plus tard si le besoin dépasse les vues internes.

## Écrans / cartes UI

- **Tableau de bord "Activité du jour"** : ce qui doit être traité
  aujourd'hui, par ordre de priorité.
- **Vue "Filtrable"** : par magasin, collaborateur, période — cohérente sur
  toutes les vues (activité, économique, qualité).

## Critères d'acceptation V1

- [ ] La vue activité reflète l'état réel des dossiers sans latence
      perceptible (pas de rapport généré une fois par nuit).
- [ ] Chaque ligne de la vue activité pointe directement vers le dossier /
      la carte concernée (pas de recherche manuelle après coup).
- [ ] Les filtres (magasin, collaborateur, période) sont cohérents avec les
      permissions de l'utilisateur connecté.

## Dépendances avec les autres modules

Dépend de **tous** les modules qui produisent des statuts (Dossier client,
Devis, Mutuelle, Commande, Facturation, SAV) — c'est pourquoi il est placé
en fin de séquence dans `PROJECT.md` (Lot 7).

---

# Module — Automatisations

*(source : `modules/automatisations/README.md`)*

# Module — Automatisations

> Section 13 du plan : "les automatisations doivent supprimer les tâches
> répétitives, pas décider à la place du professionnel". Reporté après la
> V1 (voir `PROJECT.md` — a besoin d'un historique réel de flux à
> automatiser avant d'être spécifié précisément).

## Objectif

Réduire les tâches répétitives manuelles (lecture de mail, relance,
rapprochement) sans jamais prendre de décision finale à la place du
professionnel — chaque automatisation propose, un humain valide.

## Périmètre fonctionnel (à affiner une fois le Lot 7 en production)

- Lecture des boîtes mail, extraction des références utiles, rapprochement
  avec une demande existante (ex. réponse mutuelle reçue par mail plutôt
  que par portail).
- Détection de situations à signaler : pièce manquante, délai dépassé,
  commande bloquée, réponse incohérente, reste à charge inattendu.
- Préparation de contenus : synthèse vocale, compte-rendu, brouillon de
  relance, proposition, checklist de livraison — **toujours en brouillon**,
  jamais envoyé automatiquement sans validation.
- Boîte de validation humaine centralisée, avec trace et possibilité de
  correction avant action.

## Entités concernées

Ne crée pas d'entités propres — agit sur `Demande`, `Commande`, `Facture`,
en générant des `Tâche` et des `Événement` (voir `docs/modele-donnees.md`).

## Statuts / flux clés

Chaque automatisation produit une **proposition d'action** avec un statut
`à valider → validée → appliquée` ou `à valider → rejetée`. Rien ne passe au
statut "appliquée" sans une validation humaine tracée (qui, quand).

## Intégrations nécessaires

- Accès en lecture aux boîtes mail concernées (avec consentement/config
  explicite, pas un accès systémique par défaut).
- Service de synthèse vocale/texte (réutilisation possible d'ElevenLabs,
  déjà utilisé côté medy.site).

## Écrans / cartes UI

- **Carte "À valider"** : file d'attente unique de toutes les propositions
  d'automatisation, quel que soit le module d'origine.
- **Carte "Historique des automatisations"** : ce qui a été proposé, validé,
  rejeté, et par qui.

## Critères d'acceptation (quand ce module sera réalisé)

- [ ] Aucune automatisation n'envoie de communication externe (email, SMS)
      sans validation humaine préalable.
- [ ] Chaque proposition d'automatisation indique sa source (quel email,
      quelle donnée) pour permettre une vérification rapide.
- [ ] Un rejet répété du même type de proposition doit pouvoir désactiver
      cette automatisation spécifique (éviter le bruit).

## Dépendances avec les autres modules

Transverse à tous les modules de flux (Mutuelle, Commande, Facturation en
particulier). Doit être réalisé **après** avoir observé un historique réel
via le module Pilotage — pas en V1, pour éviter d'automatiser des flux mal
compris.

---

## Fin du dossier de cadrage

Prochaine étape : création du projet définitif dans un autre dépôt, en
reprenant cette base. Voir la section "Prochaines étapes" de la Proposition
de projet ci-dessus pour les points encore à trancher avant le premier lot
de réalisation.
