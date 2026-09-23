export type Module = {
  slug: string;
  emoji: string;
  titre: string;
  accroche: string;
  objectif: string;
  perimetre: string[];
  degrade: string; // classes Tailwind (from-… to-…)
  lot: string;
  disponible: boolean;
  href: string;
};

/**
 * Les 9 modules du dossier de cadrage (docs/dossier-cadrage.md). Source
 * unique de vérité pour le hub d'accueil et les pages d'aperçu par module.
 */
export const MODULES: Module[] = [
  {
    slug: "dossier-client",
    emoji: "🧾",
    titre: "Dossier client",
    accroche: "Carte 1 — la fondation du parcours",
    objectif:
      "Capturer, dès l'accueil, tout ce qui identifie la personne, son foyer, ses droits et son besoin réel — sans ralentir l'échange au comptoir, et sans jamais faire ressaisir une information déjà connue.",
    perimetre: [
      "État civil, coordonnées, préférences de contact, consentements RGPD",
      "Rattachement foyer / assuré / porteur",
      "Collecte guidée des pièces (carte Vitale, mutuelle, ordonnance)",
      "Mini-audit vocal avec synthèse IA validée par un humain",
    ],
    degrade: "from-amber-400 to-orange-500",
    lot: "Lot 1 — réalisé",
    disponible: true,
    href: "/dossiers",
  },
  {
    slug: "produits-catalogue",
    emoji: "🕶️",
    titre: "Produits & catalogue",
    accroche: "Carte 2 — un produit réel, jamais une promesse théorique",
    objectif:
      "Donner accès, au moment de composer une proposition, à des produits réels et disponibles — monture, verres, lentilles ou appareils auditifs — jamais déconnectés du stock ou du tarif fournisseur du jour.",
    perimetre: [
      "Catalogue fournisseurs, tarifs, disponibilité",
      "Stock par magasin (multi-magasin)",
      "Historique de prix pour traçabilité",
    ],
    degrade: "from-teal-400 to-emerald-500",
    lot: "Lot 2 — à venir",
    disponible: false,
    href: "/modules/produits-catalogue",
  },
  {
    slug: "devis-proposition",
    emoji: "📝",
    titre: "Devis & proposition",
    accroche: "Composer, comparer, tracer la proposition commerciale",
    objectif:
      "Composer une proposition adaptée au besoin et au budget, en gardant la trace de toutes les versions, alternatives et du choix final — jamais un document qui écrase le précédent.",
    perimetre: [
      "Plusieurs propositions en parallèle pour un même dossier",
      "Devis normalisé (ex. 100% Santé)",
      "Signature électronique du devis retenu",
    ],
    degrade: "from-sky-400 to-blue-500",
    lot: "Lot 3 — à venir",
    disponible: false,
    href: "/modules/devis-proposition",
  },
  {
    slug: "mutuelle-tiers-payant",
    emoji: "🤝",
    titre: "Mutuelle & tiers payant",
    accroche: "Un flux suivi, pas un aller-retour de mails",
    objectif:
      "Remplacer les échanges manuels avec les mutuelles par un flux suivi et tracé : demande d'accord, réponse, rapprochement, avec blocage explicite si une information manque.",
    perimetre: [
      "Télétransmission des demandes de prise en charge",
      "Rapprochement automatique réponse ↔ demande",
      "Blocage du calcul si mutuelle non renseignée",
    ],
    degrade: "from-fuchsia-400 to-pink-500",
    lot: "Lot 4 — à venir (à valider avec Medy)",
    disponible: false,
    href: "/modules/mutuelle-tiers-payant",
  },
  {
    slug: "commande-livraison",
    emoji: "📦",
    titre: "Commande & livraison",
    accroche: "Commander, réceptionner, contrôler, livrer",
    objectif:
      "Faire exister, une fois une proposition acceptée, une chaîne commande → réception → contrôle → remise au client → ajustement, sans perte d'information entre chaque étape.",
    perimetre: [
      "Passage de commande fournisseur",
      "Réception et contrôle qualité",
      "Remise client avec ajustement/réglage tracé",
    ],
    degrade: "from-indigo-400 to-violet-500",
    lot: "Lot 5 — à venir",
    disponible: false,
    href: "/modules/commande-livraison",
  },
  {
    slug: "facturation-financement",
    emoji: "💳",
    titre: "Facturation & financement",
    accroche: "Encaisser sans perdre le lien client",
    objectif:
      "Solder financièrement un dossier — acompte, encaissement, facture, avoir, impayé, relance — sans perdre le lien avec la proposition, la mutuelle et la livraison.",
    perimetre: [
      "Facture reprenant automatiquement le reste à charge validé",
      "Suivi des impayés et relances",
      "V1.1 : paiement fractionné / financement",
    ],
    degrade: "from-rose-400 to-red-500",
    lot: "Lot 6 — à venir",
    disponible: false,
    href: "/modules/facturation-financement",
  },
  {
    slug: "sav",
    emoji: "🛠️",
    titre: "SAV",
    accroche: "Réactiver le dossier, jamais repartir de zéro",
    objectif:
      "Traiter un incident après livraison en le rattachant au dossier et à la livraison d'origine — diagnostic, garantie, réparation, échange, remboursement.",
    perimetre: [
      "Ouverture depuis la fiche Livraison ou Produit existante",
      "Gestion de garantie constructeur/magasin",
      "Réactivation du dossier (nouvelle proposition/commande)",
    ],
    degrade: "from-cyan-400 to-teal-500",
    lot: "Lot 8 (V1.1) — à venir",
    disponible: false,
    href: "/modules/sav",
  },
  {
    slug: "pilotage",
    emoji: "📊",
    titre: "Pilotage",
    accroche: "Des dossiers aux décisions magasin",
    objectif:
      "Donner une vue transverse sur tous les dossiers en cours, pour transformer des dossiers individuels en décisions de gestion au niveau du magasin.",
    perimetre: [
      "Vue activité : dossiers ouverts, retards, SAV à traiter",
      "V1.1 : vues économique et qualité",
      "Filtres magasin, collaborateur, période",
    ],
    degrade: "from-violet-400 to-purple-500",
    lot: "Lot 7 — à venir",
    disponible: false,
    href: "/modules/pilotage",
  },
  {
    slug: "automatisations",
    emoji: "✨",
    titre: "Automatisations",
    accroche: "Proposer, jamais décider à la place du professionnel",
    objectif:
      "Réduire les tâches répétitives (lecture mail, relance, rapprochement) sans jamais prendre de décision finale à la place du professionnel — chaque automatisation propose, un humain valide.",
    perimetre: [
      "Lecture des boîtes mail et rapprochement",
      "Détection de blocages (pièce manquante, délai dépassé)",
      "Boîte de validation humaine centralisée",
    ],
    degrade: "from-yellow-400 to-amber-500",
    lot: "Lot 9 (V2) — à venir",
    disponible: false,
    href: "/modules/automatisations",
  },
];

export function trouverModule(slug: string): Module | undefined {
  return MODULES.find((m) => m.slug === slug);
}
