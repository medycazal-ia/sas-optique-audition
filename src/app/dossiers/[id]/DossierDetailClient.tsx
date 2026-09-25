"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type {
  Avoir,
  Commande,
  CommandeLigne,
  DemandePriseEnCharge,
  Document,
  Evenement,
  Facture,
  Livraison,
  Ordonnance,
  Paiement,
  Personne,
  Produit,
  Proposition,
  PropositionLigne,
  SAV,
} from "@prisma/client";
import type { PieceRequise } from "@/lib/completude";
import { formaterPrix, parserPrixEnCentimes } from "@/lib/argent";
import { garantieExpiree } from "@/lib/sav";
import Carrousel from "@/components/Carrousel";

type PersonneAvecRelations = Personne & {
  documents: Document[];
  ordonnances: Ordonnance[];
  evenements: Evenement[];
};

type FactureAvecTout = Facture & { paiements: Paiement[]; avoirs: Avoir[] };

type CommandeAvecLignesSimples = Commande & { lignes: CommandeLigne[] };

type SAVAvecCommande = SAV & { commandeRemplacement: CommandeAvecLignesSimples | null };

type LivraisonAvecTout = Livraison & { facture: FactureAvecTout | null; savs: SAVAvecCommande[] };

type CommandeLigneAvecProduit = CommandeLigne & { produit: Produit };

type CommandeAvecTout = Commande & { lignes: CommandeLigneAvecProduit[]; livraison: LivraisonAvecTout | null };

type PropositionAvecLignes = Proposition & {
  lignes: PropositionLigne[];
  demandes: DemandePriseEnCharge[];
  commandes: CommandeAvecTout[];
};

const ID_CARTE_FACTURATION = "carte-facturation";

/**
 * Suivi, pour la durée de cette page seulement (aucune persistance — remis à
 * zéro au prochain chargement), de la carte/ligne "active" (atteinte par un
 * clic ou une redirection) et de celles "visitées puis quittées" pendant
 * cette même session de consultation. Sert à la mise en surbrillance :
 * contour orange sur l'élément actif, gris léger sur les précédents.
 */
const SurbrillanceContext = createContext<{
  idActif: string | null;
  idsVisites: Set<string>;
  activer: (id: string) => void;
}>({ idActif: null, idsVisites: new Set(), activer: () => {} });

function useSurbrillance() {
  return useContext(SurbrillanceContext);
}

/** Classes de contour à appliquer à un élément identifié par `id`. */
function classesSurbrillance(id: string | undefined, ctx: ReturnType<typeof useSurbrillance>): string {
  if (!id) return "";
  if (id === ctx.idActif) return "ring-2 ring-orange-400 ring-offset-2";
  if (ctx.idsVisites.has(id)) return "ring-1 ring-neutral-300";
  return "";
}

export default function DossierDetailClient({
  personne,
  completude,
  propositions,
  ventesDirectes,
}: {
  personne: PersonneAvecRelations;
  completude: PieceRequise[];
  propositions: PropositionAvecLignes[];
  ventesDirectes: CommandeAvecTout[];
}) {
  const [idActif, setIdActif] = useState<string | null>(null);
  const [idsVisites, setIdsVisites] = useState<Set<string>>(new Set());

  const activer = useCallback((id: string) => {
    setIdActif((precedent) => {
      if (precedent && precedent !== id) {
        setIdsVisites((s) => (s.has(precedent) ? s : new Set(s).add(precedent)));
      }
      return id;
    });
  }, []);

  // Atterrissage depuis la recherche de client de la carte Facturation d'un
  // autre dossier (lien en `#carte-facturation` ou `#facture-xxx` pour une
  // facture précise) : on rejoint directement le bon endroit plutôt que de
  // laisser l'utilisateur le retrouver lui-même, et on le met en surbrillance.
  useEffect(() => {
    const cible = window.location.hash.slice(1);
    if (cible) {
      document.getElementById(cible)?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
      activer(cible);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <SurbrillanceContext.Provider value={{ idActif, idsVisites, activer }}>
      <div className="mt-8">
        <Carrousel>
          <InformationsPersonnelles personne={personne} />
          <Completude dossierId={personne.id} completude={completude} documents={personne.documents} />
          <Propositions dossierId={personne.id} propositions={propositions} />
          <MutuelleEtTiersPayant personne={personne} propositions={propositions} />
          <CommandeEtLivraison propositions={propositions} />
          <FacturationEtFinancement dossierId={personne.id} propositions={propositions} ventesDirectes={ventesDirectes} />
          <SAVCarte propositions={propositions} />
          <ConsentementsRgpd personne={personne} />
          <SyntheseBesoin personne={personne} />
          <JournalEvenements evenements={personne.evenements} />
        </Carrousel>
      </div>
    </SurbrillanceContext.Provider>
  );
}

function Carte({
  id,
  titre,
  sousTitre,
  emoji,
  degrade,
  children,
}: {
  id?: string;
  titre: string;
  sousTitre?: string;
  emoji: string;
  degrade: string;
  children: React.ReactNode;
}) {
  const surbrillance = useSurbrillance();
  return (
    <section
      id={id}
      className={`anim-pop flex h-[520px] w-[85vw] max-w-[420px] flex-col overflow-hidden rounded-[28px] border border-neutral-200 bg-white shadow-lg transition-shadow ${classesSurbrillance(id, surbrillance)}`}
    >
      <div className={`flex items-center gap-3 bg-gradient-to-r ${degrade} px-6 py-5 text-white`}>
        <span className="text-3xl drop-shadow-sm">{emoji}</span>
        <div>
          <h2 className="text-lg font-bold leading-tight">{titre}</h2>
          {sousTitre && <p className="text-xs text-white/85">{sousTitre}</p>}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-6">{children}</div>
    </section>
  );
}

function InformationsPersonnelles({ personne }: { personne: Personne }) {
  const router = useRouter();
  const { activer } = useSurbrillance();
  const [champs, setChamps] = useState({
    numeroSecuriteSociale: personne.numeroSecuriteSociale ?? "",
    telephone: personne.telephone ?? "",
    email: personne.email ?? "",
    adresse: personne.adresse ?? "",
    codePostal: personne.codePostal ?? "",
    ville: personne.ville ?? "",
  });
  const [envoi, setEnvoi] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function enregistrer() {
    setEnvoi(true);
    setMessage(null);
    const reponse = await fetch(`/api/dossiers/${personne.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(champs),
    });
    setEnvoi(false);
    if (reponse.ok) {
      setMessage("Enregistré.");
      router.refresh();
    } else {
      setMessage("Erreur lors de l'enregistrement.");
    }
  }

  const identiteComplete = Boolean(personne.nom.trim() && personne.prenom.trim());

  function allerVersVenteDirecte() {
    document
      .getElementById(ID_CARTE_FACTURATION)
      ?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
    activer(ID_CARTE_FACTURATION);
  }

  return (
    <Carte
      titre="Coordonnées"
      sousTitre="Lues par les modules Devis, Mutuelle et Facturation — jamais ressaisies ailleurs."
      emoji="📇"
      degrade="from-orange-400 to-amber-500"
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-sm sm:col-span-2">
          Numéro de sécurité sociale <span className="font-normal text-neutral-400">(optionnel)</span>
          <input
            value={champs.numeroSecuriteSociale}
            onChange={(e) => setChamps({ ...champs, numeroSecuriteSociale: e.target.value })}
            inputMode="numeric"
            className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm tracking-wide"
          />
        </label>
        <label className="text-sm">
          Téléphone
          <input
            value={champs.telephone}
            onChange={(e) => setChamps({ ...champs, telephone: e.target.value })}
            className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
          />
        </label>
        <label className="text-sm">
          Email
          <input
            value={champs.email}
            onChange={(e) => setChamps({ ...champs, email: e.target.value })}
            className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
          />
        </label>
        <label className="text-sm sm:col-span-2">
          Adresse
          <input
            value={champs.adresse}
            onChange={(e) => setChamps({ ...champs, adresse: e.target.value })}
            className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
          />
        </label>
        <label className="text-sm">
          Code postal
          <input
            value={champs.codePostal}
            onChange={(e) => setChamps({ ...champs, codePostal: e.target.value })}
            className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
          />
        </label>
        <label className="text-sm">
          Ville
          <input
            value={champs.ville}
            onChange={(e) => setChamps({ ...champs, ville: e.target.value })}
            className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
          />
        </label>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button
          onClick={enregistrer}
          disabled={envoi}
          className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700 disabled:opacity-50"
        >
          {envoi ? "Enregistrement…" : "Enregistrer"}
        </button>
        <button
          onClick={allerVersVenteDirecte}
          disabled={!identiteComplete}
          title={!identiteComplete ? "Nom et prénom requis avant une vente directe." : undefined}
          className="rounded-lg bg-gradient-to-r from-emerald-500 to-teal-500 px-3 py-2 text-sm font-semibold text-white shadow-md transition hover:scale-[1.02] disabled:cursor-not-allowed disabled:from-neutral-300 disabled:to-neutral-300 disabled:text-neutral-500 disabled:shadow-none disabled:hover:scale-100"
        >
          🛒 Vente directe
        </button>
        {message && <span className="text-sm text-neutral-500">{message}</span>}
      </div>
      {!identiteComplete && (
        <p className="mt-1 text-xs text-neutral-400">Renseignez nom et prénom pour activer la vente directe.</p>
      )}
    </Carte>
  );
}

function Completude({
  dossierId,
  completude,
  documents,
}: {
  dossierId: string;
  completude: PieceRequise[];
  documents: Document[];
}) {
  const router = useRouter();
  const [enCours, setEnCours] = useState<string | null>(null);
  const inputsFichier = useRef<Record<string, HTMLInputElement | null>>({});

  async function marquerVerifieeSansScan(type: PieceRequise["type"]) {
    setEnCours(type);
    await fetch(`/api/dossiers/${dossierId}/documents`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type }),
    });
    setEnCours(null);
    router.refresh();
  }

  async function televerserScan(type: PieceRequise["type"], fichier: File) {
    setEnCours(type);
    const formulaire = new FormData();
    formulaire.append("type", type);
    formulaire.append("fichier", fichier);
    await fetch(`/api/dossiers/${dossierId}/documents`, { method: "POST", body: formulaire });
    setEnCours(null);
    router.refresh();
  }

  return (
    <Carte
      titre="Complétude du dossier"
      sousTitre="Pièce suivante à fournir, plutôt qu'un formulaire libre."
      emoji="📎"
      degrade="from-emerald-400 to-teal-500"
    >
      <ul className="divide-y divide-neutral-100">
        {completude.map((piece) => {
          const document = documents.find((d) => d.type === piece.type);
          return (
            <li key={piece.type} className="flex items-center justify-between gap-2 py-2">
              <span className="text-sm text-neutral-800">{piece.libelle}</span>
              {piece.obtenue ? (
                document ? (
                  <a
                    href={`/api/dossiers/${dossierId}/documents/${document.id}/telecharger`}
                    className="text-sm font-medium text-emerald-600 hover:underline"
                  >
                    ✓ {document.cheminStockage.startsWith("verifie-sans-scan/") ? "Vérifiée (pas de scan)" : "Voir le scan"}
                  </a>
                ) : (
                  <span className="text-sm font-medium text-emerald-600">✓ Obtenue</span>
                )
              ) : (
                <div className="flex items-center gap-2">
                  <input
                    ref={(el) => {
                      inputsFichier.current[piece.type] = el;
                    }}
                    type="file"
                    accept="image/*,.pdf"
                    className="hidden"
                    onChange={(e) => {
                      const fichier = e.target.files?.[0];
                      if (fichier) televerserScan(piece.type, fichier);
                    }}
                  />
                  <button
                    onClick={() => inputsFichier.current[piece.type]?.click()}
                    disabled={enCours === piece.type}
                    className="rounded-md bg-neutral-900 px-3 py-1 text-xs font-medium text-white hover:bg-neutral-700 disabled:opacity-50"
                  >
                    {enCours === piece.type ? "…" : "Scanner / téléverser"}
                  </button>
                  <button
                    onClick={() => marquerVerifieeSansScan(piece.type)}
                    disabled={enCours === piece.type}
                    className="rounded-md border border-neutral-300 px-3 py-1 text-xs font-medium hover:bg-neutral-50 disabled:opacity-50"
                  >
                    Vérifiée sans scan
                  </button>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </Carte>
  );
}

const LIBELLE_STATUT_PROPOSITION: Record<string, string> = {
  BROUILLON: "Brouillon",
  ENVOYEE: "Envoyée",
  ACCEPTEE: "Acceptée",
  REFUSEE: "Refusée",
  EXPIREE: "Expirée",
};

const COULEUR_STATUT_PROPOSITION: Record<string, string> = {
  BROUILLON: "bg-neutral-200 text-neutral-700",
  ENVOYEE: "bg-sky-100 text-sky-700",
  ACCEPTEE: "bg-emerald-100 text-emerald-700",
  REFUSEE: "bg-red-100 text-red-700",
  EXPIREE: "bg-amber-100 text-amber-700",
};

function Propositions({ dossierId, propositions }: { dossierId: string; propositions: PropositionAvecLignes[] }) {
  const router = useRouter();
  const [creation, setCreation] = useState(false);

  async function nouvelleProposition() {
    setCreation(true);
    const reponse = await fetch(`/api/dossiers/${dossierId}/propositions`, { method: "POST" });
    setCreation(false);
    if (reponse.ok) {
      const proposition = await reponse.json();
      router.push(`/propositions/${proposition.id}`);
    }
  }

  return (
    <Carte
      titre="Propositions"
      sousTitre="Chaque version reste consultable, même refusée ou remplacée."
      emoji="📝"
      degrade="from-sky-400 to-blue-500"
    >
      {propositions.length === 0 ? (
        <p className="text-sm text-neutral-500">Aucune proposition composée pour l&apos;instant.</p>
      ) : (
        <ul className="space-y-2">
          {propositions.map((p) => {
            const total = p.lignes.reduce((s, l) => s + l.prixUnitaireTTC * l.quantite, 0);
            return (
              <li key={p.id}>
                <Link
                  href={`/propositions/${p.id}`}
                  className="flex items-center justify-between rounded-lg border border-neutral-200 px-3 py-2 text-sm hover:bg-neutral-50"
                >
                  <span className="text-neutral-700">
                    {new Date(p.creeA).toLocaleDateString("fr-FR")} · {p.lignes.length} article(s)
                  </span>
                  <span className="flex items-center gap-2">
                    <span className="font-medium text-neutral-900">{formaterPrix(total)}</span>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${COULEUR_STATUT_PROPOSITION[p.statut]}`}>
                      {LIBELLE_STATUT_PROPOSITION[p.statut]}
                    </span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      <button
        onClick={nouvelleProposition}
        disabled={creation}
        className="mt-4 w-full rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700 disabled:opacity-50"
      >
        {creation ? "Création…" : "+ Nouvelle proposition"}
      </button>
    </Carte>
  );
}

const LIBELLE_STATUT_DEMANDE: Record<string, string> = {
  A_ENVOYER: "À envoyer",
  ENVOYEE: "Envoyée",
  EN_ATTENTE: "En attente",
  ACCORD: "Accord",
  REFUS: "Refus",
};

const COULEUR_STATUT_DEMANDE: Record<string, string> = {
  A_ENVOYER: "bg-neutral-200 text-neutral-700",
  ENVOYEE: "bg-sky-100 text-sky-700",
  EN_ATTENTE: "bg-sky-100 text-sky-700",
  ACCORD: "bg-emerald-100 text-emerald-700",
  REFUS: "bg-red-100 text-red-700",
};

function MutuelleEtTiersPayant({
  personne,
  propositions,
}: {
  personne: Personne;
  propositions: PropositionAvecLignes[];
}) {
  const router = useRouter();
  const mutuelleRenseignee = Boolean(personne.mutuelleNom);
  const mutuelleRefusee = Boolean(personne.mutuelleRefuseeA) && !mutuelleRenseignee;

  const demandes = propositions.flatMap((p) => p.demandes.map((d) => ({ demande: d, proposition: p })));

  return (
    <Carte
      titre="Mutuelle & tiers payant"
      sousTitre="Un flux suivi, pas un aller-retour de mails — jamais de reste à charge sans mutuelle vérifiée."
      emoji="🤝"
      degrade="from-purple-400 to-fuchsia-500"
    >
      <MutuelleInfos personne={personne} onFait={() => router.refresh()} />

      <div className="mt-5 border-t border-neutral-100 pt-4">
        <h3 className="text-sm font-semibold text-neutral-800">Demandes de prise en charge</h3>
        {demandes.length === 0 ? (
          <p className="mt-2 text-sm text-neutral-500">
            Aucune demande pour l&apos;instant — créée automatiquement à l&apos;acceptation d&apos;une proposition.
          </p>
        ) : (
          <ul className="mt-2 space-y-3">
            {demandes.map(({ demande, proposition }) => (
              <DemandeLigne
                key={demande.id}
                demande={demande}
                proposition={proposition}
                mutuelleBloquante={!mutuelleRenseignee && !mutuelleRefusee}
                onFait={() => router.refresh()}
              />
            ))}
          </ul>
        )}
      </div>
    </Carte>
  );
}

function MutuelleInfos({ personne, onFait }: { personne: Personne; onFait: () => void }) {
  const [edition, setEdition] = useState(false);
  const [nom, setNom] = useState(personne.mutuelleNom ?? "");
  const [numeroAdherent, setNumeroAdherent] = useState(personne.mutuelleNumeroAdherent ?? "");
  const [envoi, setEnvoi] = useState(false);

  async function enregistrer() {
    if (!nom.trim()) return;
    setEnvoi(true);
    await fetch(`/api/dossiers/${personne.id}/mutuelle`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mutuelleNom: nom, mutuelleNumeroAdherent: numeroAdherent }),
    });
    setEnvoi(false);
    setEdition(false);
    onFait();
  }

  async function refuser() {
    setEnvoi(true);
    await fetch(`/api/dossiers/${personne.id}/mutuelle`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refuser: true }),
    });
    setEnvoi(false);
    onFait();
  }

  if (!edition && personne.mutuelleNom) {
    return (
      <div className="flex items-center justify-between rounded-lg border border-neutral-200 px-3 py-2">
        <div>
          <p className="text-sm font-medium text-neutral-800">{personne.mutuelleNom}</p>
          {personne.mutuelleNumeroAdherent && (
            <p className="text-xs text-neutral-500">Adhérent n° {personne.mutuelleNumeroAdherent}</p>
          )}
        </div>
        <button onClick={() => setEdition(true)} className="text-xs text-neutral-500 hover:underline">
          Modifier
        </button>
      </div>
    );
  }

  return (
    <div>
      {!edition && personne.mutuelleRefuseeA && (
        <p className="mb-2 text-xs text-amber-700">
          Refus explicite tracé le {new Date(personne.mutuelleRefuseeA).toLocaleDateString("fr-FR")}.
        </p>
      )}
      {!edition && !personne.mutuelleRefuseeA && (
        <p className="mb-2 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800">
          ⚠️ Mutuelle non renseignée — bloque le calcul du reste à charge tant que non renseignée ou refusée
          explicitement.
        </p>
      )}
      <div className="grid gap-2 sm:grid-cols-2">
        <input
          value={nom}
          onChange={(e) => setNom(e.target.value)}
          placeholder="Nom de la mutuelle"
          className="rounded-md border border-neutral-300 px-3 py-2 text-sm"
        />
        <input
          value={numeroAdherent}
          onChange={(e) => setNumeroAdherent(e.target.value)}
          placeholder="N° adhérent (optionnel)"
          className="rounded-md border border-neutral-300 px-3 py-2 text-sm"
        />
      </div>
      <div className="mt-2 flex items-center gap-2">
        <button
          onClick={enregistrer}
          disabled={envoi || !nom.trim()}
          className="rounded-md bg-neutral-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-neutral-700 disabled:opacity-50"
        >
          Enregistrer
        </button>
        {!personne.mutuelleRefuseeA && (
          <button
            onClick={refuser}
            disabled={envoi}
            className="rounded-md border border-neutral-300 px-3 py-1.5 text-xs font-medium hover:bg-neutral-50 disabled:opacity-50"
          >
            Le client refuse de la renseigner
          </button>
        )}
        {edition && (
          <button onClick={() => setEdition(false)} className="text-xs text-neutral-500 hover:underline">
            Annuler
          </button>
        )}
      </div>
    </div>
  );
}

function DemandeLigne({
  demande,
  proposition,
  mutuelleBloquante,
  onFait,
}: {
  demande: DemandePriseEnCharge;
  proposition: PropositionAvecLignes;
  mutuelleBloquante: boolean;
  onFait: () => void;
}) {
  const [envoi, setEnvoi] = useState(false);
  const [reponseOuverte, setReponseOuverte] = useState(false);
  const [montant, setMontant] = useState("");
  const [motifRefus, setMotifRefus] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);

  const total = proposition.lignes.reduce((s, l) => s + l.prixUnitaireTTC * l.quantite, 0);

  async function marquerEnvoyee() {
    setEnvoi(true);
    await fetch(`/api/demandes-mutuelle/${demande.id}/envoyer`, { method: "POST" });
    setEnvoi(false);
    onFait();
  }

  async function enregistrerAccord() {
    const centimes = parserPrixEnCentimes(montant);
    if (centimes === null) {
      setErreur("Montant pris en charge invalide.");
      return;
    }
    setEnvoi(true);
    setErreur(null);
    const reponse = await fetch(`/api/demandes-mutuelle/${demande.id}/reponse`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ decision: "ACCORD", montantPriseEnChargeTTC: centimes }),
    });
    setEnvoi(false);
    if (reponse.ok) {
      onFait();
    } else {
      const data = await reponse.json().catch(() => ({}));
      setErreur(data.erreur ?? "Erreur.");
    }
  }

  async function enregistrerRefus() {
    setEnvoi(true);
    setErreur(null);
    await fetch(`/api/demandes-mutuelle/${demande.id}/reponse`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ decision: "REFUS", motifRefus }),
    });
    setEnvoi(false);
    onFait();
  }

  return (
    <li className="rounded-lg border border-neutral-200 p-3">
      <div className="flex items-center justify-between">
        <span className="text-sm text-neutral-700">
          Proposition du {new Date(proposition.creeA).toLocaleDateString("fr-FR")} · {formaterPrix(total)}
        </span>
        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${COULEUR_STATUT_DEMANDE[demande.statut]}`}>
          {LIBELLE_STATUT_DEMANDE[demande.statut]}
        </span>
      </div>

      {demande.statut === "A_ENVOYER" && (
        <button
          onClick={marquerEnvoyee}
          disabled={envoi}
          className="mt-2 rounded-md bg-neutral-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-neutral-700 disabled:opacity-50"
        >
          Marquer envoyée
        </button>
      )}

      {(demande.statut === "ENVOYEE" || demande.statut === "EN_ATTENTE") && (
        <div className="mt-2">
          {demande.envoyeeA && (
            <p className="text-xs text-neutral-500">
              Envoyée le {new Date(demande.envoyeeA).toLocaleDateString("fr-FR")}.
            </p>
          )}
          {!reponseOuverte ? (
            <button
              onClick={() => setReponseOuverte(true)}
              className="mt-1 text-xs font-medium text-sky-700 hover:underline"
            >
              Enregistrer la réponse mutuelle
            </button>
          ) : (
            <div className="mt-2 space-y-2">
              {mutuelleBloquante && (
                <p className="rounded-md bg-amber-50 px-2 py-1.5 text-xs text-amber-800">
                  Renseignez la mutuelle du dossier (ou tracez un refus explicite) avant de pouvoir enregistrer un
                  accord.
                </p>
              )}
              <div className="flex items-center gap-2">
                <input
                  value={montant}
                  onChange={(e) => setMontant(e.target.value)}
                  placeholder="Montant pris en charge (€)"
                  disabled={mutuelleBloquante}
                  className="w-40 rounded-md border border-neutral-300 px-2 py-1 text-xs disabled:opacity-50"
                />
                <button
                  onClick={enregistrerAccord}
                  disabled={envoi || mutuelleBloquante}
                  className="rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                >
                  Accord
                </button>
              </div>
              <div className="flex items-center gap-2">
                <input
                  value={motifRefus}
                  onChange={(e) => setMotifRefus(e.target.value)}
                  placeholder="Motif de refus (optionnel)"
                  className="w-40 rounded-md border border-neutral-300 px-2 py-1 text-xs"
                />
                <button
                  onClick={enregistrerRefus}
                  disabled={envoi}
                  className="rounded-md border border-red-300 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                >
                  Refus
                </button>
              </div>
              {erreur && <p className="text-xs text-red-600">{erreur}</p>}
            </div>
          )}
        </div>
      )}

      {demande.statut === "ACCORD" && (
        <p className="mt-2 text-xs text-emerald-700">
          Pris en charge : {formaterPrix(demande.montantPriseEnChargeTTC ?? 0)} · Reste à charge :{" "}
          {formaterPrix(proposition.resteAChargeTTC ?? 0)}
        </p>
      )}
      {demande.statut === "REFUS" && (
        <p className="mt-2 text-xs text-red-600">Refusé{demande.motifRefus ? ` — ${demande.motifRefus}` : ""}.</p>
      )}
    </li>
  );
}

const LIBELLE_STATUT_COMMANDE: Record<string, string> = {
  A_PASSER: "À passer",
  PASSEE: "Passée",
  CONFIRMEE: "Confirmée",
  RECUE: "Reçue",
  CONTROLEE: "Contrôlée",
};

const LIBELLE_STATUT_LIVRAISON: Record<string, string> = {
  PROGRAMMEE: "Programmée",
  REMISE: "Remise",
  AJUSTEMENT_DEMANDE: "Ajustement demandé",
  CLOTUREE: "Clôturée",
};

function delaiDepasse(commande: Commande): boolean {
  if (!commande.delaiJoursEstime || !commande.passeeA) return false;
  if (commande.statut !== "PASSEE" && commande.statut !== "CONFIRMEE") return false;
  const echeance = new Date(commande.passeeA).getTime() + commande.delaiJoursEstime * 86_400_000;
  return Date.now() > echeance;
}

function CommandeEtLivraison({ propositions }: { propositions: PropositionAvecLignes[] }) {
  const router = useRouter();
  const acceptees = propositions.filter((p) => p.statut === "ACCEPTEE");

  return (
    <Carte
      titre="Commande & livraison"
      sousTitre="Commander, réceptionner, contrôler et livrer — sans perte d'information entre chaque étape."
      emoji="📦"
      degrade="from-indigo-400 to-violet-500"
    >
      {acceptees.length === 0 ? (
        <p className="text-sm text-neutral-500">Aucune proposition acceptée pour l&apos;instant.</p>
      ) : (
        <ul className="space-y-4">
          {acceptees.map((p) => (
            <PropositionCommande key={p.id} proposition={p} onFait={() => router.refresh()} />
          ))}
        </ul>
      )}
    </Carte>
  );
}

function PropositionCommande({ proposition, onFait }: { proposition: PropositionAvecLignes; onFait: () => void }) {
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const total = proposition.lignes.reduce((s, l) => s + l.prixUnitaireTTC * l.quantite, 0);
  const commande = proposition.commandes[0];

  async function passerCommande(forcer = false) {
    setEnvoi(true);
    setErreur(null);
    const reponse = await fetch(`/api/propositions/${proposition.id}/commande`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ forcerMalgreMutuelleEnAttente: forcer }),
    });
    setEnvoi(false);
    if (reponse.ok) {
      onFait();
    } else {
      const data = await reponse.json().catch(() => ({}));
      setErreur(data.astuce ? `${data.erreur} ${data.astuce}` : (data.erreur ?? "Erreur."));
    }
  }

  return (
    <li className="rounded-lg border border-neutral-200 p-3">
      <div className="flex items-center justify-between text-sm">
        <span className="text-neutral-700">
          Proposition du {new Date(proposition.creeA).toLocaleDateString("fr-FR")} · {formaterPrix(total)}
        </span>
      </div>

      {!commande ? (
        <div className="mt-2">
          <button
            onClick={() => passerCommande(false)}
            disabled={envoi}
            className="rounded-md bg-neutral-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-neutral-700 disabled:opacity-50"
          >
            Passer commande
          </button>
          {erreur && (
            <div className="mt-2 rounded-md bg-amber-50 px-2 py-1.5 text-xs text-amber-800">
              {erreur}
              {erreur.includes("forcerMalgreMutuelleEnAttente") && (
                <button onClick={() => passerCommande(true)} className="ml-2 underline">
                  Passer commande quand même
                </button>
              )}
            </div>
          )}
        </div>
      ) : (
        <CommandeDetail commande={commande} onFait={onFait} />
      )}
    </li>
  );
}

function CommandeDetail({ commande, onFait }: { commande: CommandeAvecTout; onFait: () => void }) {
  const [envoi, setEnvoi] = useState(false);
  const [delaiJoursEstime, setDelaiJoursEstime] = useState("");
  const [numerosSerie, setNumerosSerie] = useState<Record<string, string>>({});
  const depassee = delaiDepasse(commande);

  async function transition(action: string, body?: unknown) {
    setEnvoi(true);
    await fetch(`/api/commandes/${commande.id}/${action}`, {
      method: "POST",
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    setEnvoi(false);
    onFait();
  }

  return (
    <div className="mt-2 rounded-md border border-neutral-100 bg-neutral-50 p-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-neutral-700">Commande : {LIBELLE_STATUT_COMMANDE[commande.statut]}</span>
        {depassee && (
          <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">⚠️ Délai dépassé</span>
        )}
      </div>

      {commande.statut === "A_PASSER" && (
        <div className="mt-2 flex items-center gap-2">
          <input
            value={delaiJoursEstime}
            onChange={(e) => setDelaiJoursEstime(e.target.value)}
            placeholder="Délai estimé (jours)"
            className="w-36 rounded-md border border-neutral-300 px-2 py-1 text-xs"
          />
          <button
            onClick={() =>
              transition("passer", {
                delaiJoursEstime: Number.isInteger(Number(delaiJoursEstime)) && delaiJoursEstime ? Number(delaiJoursEstime) : null,
              })
            }
            disabled={envoi}
            className="rounded-md bg-neutral-900 px-3 py-1 text-xs font-medium text-white hover:bg-neutral-700 disabled:opacity-50"
          >
            Marquer passée
          </button>
        </div>
      )}

      {commande.statut === "PASSEE" && (
        <button
          onClick={() => transition("confirmer")}
          disabled={envoi}
          className="mt-2 rounded-md bg-neutral-900 px-3 py-1 text-xs font-medium text-white hover:bg-neutral-700 disabled:opacity-50"
        >
          Marquer confirmée
        </button>
      )}

      {commande.statut === "CONFIRMEE" && (
        <button
          onClick={() => transition("recevoir")}
          disabled={envoi}
          className="mt-2 rounded-md bg-neutral-900 px-3 py-1 text-xs font-medium text-white hover:bg-neutral-700 disabled:opacity-50"
        >
          Marquer reçue
        </button>
      )}

      {commande.statut === "RECUE" && (
        <div className="mt-2 space-y-2">
          {commande.lignes.map((l) => (
            <div key={l.id} className="flex items-center gap-2">
              <span className="w-32 truncate text-xs text-neutral-600">{l.libelleProduit}</span>
              <input
                value={numerosSerie[l.id] ?? ""}
                onChange={(e) => setNumerosSerie((n) => ({ ...n, [l.id]: e.target.value }))}
                placeholder="N° de série (optionnel)"
                className="flex-1 rounded-md border border-neutral-300 px-2 py-1 text-xs"
              />
            </div>
          ))}
          <button
            onClick={() =>
              transition("controler", {
                lignes: Object.entries(numerosSerie)
                  .filter(([, v]) => v.trim())
                  .map(([ligneId, numeroSerie]) => ({ ligneId, numeroSerie })),
              })
            }
            disabled={envoi}
            className="rounded-md bg-neutral-900 px-3 py-1 text-xs font-medium text-white hover:bg-neutral-700 disabled:opacity-50"
          >
            Contrôler
          </button>
        </div>
      )}

      {commande.statut === "CONTROLEE" && commande.livraison && (
        <LivraisonDetail livraison={commande.livraison} onFait={onFait} />
      )}
    </div>
  );
}

function LivraisonDetail({ livraison, onFait }: { livraison: Livraison; onFait: () => void }) {
  const [envoi, setEnvoi] = useState(false);
  const [date, setDate] = useState("");
  const [ajustement, setAjustement] = useState("");

  async function programmer() {
    if (!date) return;
    setEnvoi(true);
    await fetch(`/api/livraisons/${livraison.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dateProgrammee: new Date(date).toISOString() }),
    });
    setEnvoi(false);
    onFait();
  }

  async function action(chemin: string, body?: unknown) {
    setEnvoi(true);
    await fetch(`/api/livraisons/${livraison.id}/${chemin}`, {
      method: "POST",
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    setEnvoi(false);
    onFait();
  }

  return (
    <div className="mt-2 border-t border-neutral-200 pt-2">
      <span className="text-xs font-medium text-neutral-700">Livraison : {LIBELLE_STATUT_LIVRAISON[livraison.statut]}</span>

      {livraison.statut === "PROGRAMMEE" && !livraison.dateProgrammee && (
        <div className="mt-2 flex items-center gap-2">
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="rounded-md border border-neutral-300 px-2 py-1 text-xs" />
          <button
            onClick={programmer}
            disabled={envoi || !date}
            className="rounded-md bg-neutral-900 px-3 py-1 text-xs font-medium text-white hover:bg-neutral-700 disabled:opacity-50"
          >
            Programmer
          </button>
        </div>
      )}

      {livraison.statut === "PROGRAMMEE" && livraison.dateProgrammee && (
        <div className="mt-2">
          <p className="text-xs text-neutral-500">
            Prévue le {new Date(livraison.dateProgrammee).toLocaleDateString("fr-FR")}.
          </p>
          <button
            onClick={() => action("remettre")}
            disabled={envoi}
            className="mt-1 rounded-md bg-neutral-900 px-3 py-1 text-xs font-medium text-white hover:bg-neutral-700 disabled:opacity-50"
          >
            Marquer remise
          </button>
        </div>
      )}

      {livraison.statut === "REMISE" && (
        <div className="mt-2 space-y-2">
          <div className="flex items-center gap-2">
            <input
              value={ajustement}
              onChange={(e) => setAjustement(e.target.value)}
              placeholder="Ajustement/réglage demandé"
              className="flex-1 rounded-md border border-neutral-300 px-2 py-1 text-xs"
            />
            <button
              onClick={() => ajustement.trim() && action("ajustement", { ajustementDemande: ajustement })}
              disabled={envoi || !ajustement.trim()}
              className="rounded-md border border-neutral-300 px-3 py-1 text-xs font-medium hover:bg-neutral-50 disabled:opacity-50"
            >
              Demander
            </button>
          </div>
          <button
            onClick={() => action("cloturer")}
            disabled={envoi}
            className="rounded-md bg-emerald-600 px-3 py-1 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            Clôturer
          </button>
        </div>
      )}

      {livraison.statut === "AJUSTEMENT_DEMANDE" && (
        <div className="mt-2 space-y-2">
          <p className="text-xs text-amber-700">Ajustement : {livraison.ajustementDemande}</p>
          <button
            onClick={() => action("cloturer")}
            disabled={envoi}
            className="rounded-md bg-emerald-600 px-3 py-1 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            Clôturer
          </button>
        </div>
      )}

      {livraison.statut === "CLOTUREE" && livraison.clotureeA && (
        <p className="mt-1 text-xs text-emerald-700">Clôturée le {new Date(livraison.clotureeA).toLocaleDateString("fr-FR")}.</p>
      )}
    </div>
  );
}

const LIBELLE_STATUT_FACTURE: Record<string, string> = {
  EMISE: "Émise",
  PAYEE_PARTIELLEMENT: "Payée partiellement",
  SOLDEE: "Soldée",
};

function soldeRestantClient(facture: FactureAvecTout): number {
  const encaisse = facture.paiements.reduce((s, p) => s + p.montantTTC, 0);
  const avoirsTotal = facture.avoirs.reduce((s, a) => s + a.montantTTC, 0);
  return facture.montantTTC - encaisse - avoirsTotal;
}

function factureEnRetardClient(facture: FactureAvecTout, solde: number): boolean {
  if (solde <= 0) return false;
  const echeance = new Date(facture.creeA).getTime() + facture.delaiPaiementJours * 86_400_000;
  return Date.now() > echeance;
}

function FacturationEtFinancement({
  dossierId,
  propositions,
  ventesDirectes,
}: {
  dossierId: string;
  propositions: PropositionAvecLignes[];
  ventesDirectes: CommandeAvecTout[];
}) {
  const router = useRouter();
  const actualiser = () => router.refresh();

  const livraisonsClotureesFacturables = [
    ...propositions.flatMap((p) =>
      p.commandes
        .filter((c) => c.livraison && c.livraison.statut === "CLOTUREE")
        .map((c) => ({
          livraison: c.livraison as LivraisonAvecTout,
          sousTitre: `proposition du ${new Date(p.creeA).toLocaleDateString("fr-FR")}`,
        })),
    ),
    ...ventesDirectes
      .filter((c) => c.livraison && c.livraison.statut === "CLOTUREE")
      .map((c) => ({ livraison: c.livraison as LivraisonAvecTout, sousTitre: "vente directe" })),
  ];

  return (
    <Carte
      id={ID_CARTE_FACTURATION}
      titre="Facturation & financement"
      sousTitre="Le montant reprend automatiquement le reste à charge validé par la mutuelle — jamais de recalcul manuel."
      emoji="💳"
      degrade="from-amber-400 to-rose-500"
    >
      {livraisonsClotureesFacturables.length === 0 ? (
        <p className="text-sm text-neutral-500">Aucune livraison clôturée à facturer pour l&apos;instant.</p>
      ) : (
        <ul className="space-y-4">
          {livraisonsClotureesFacturables.map(({ livraison, sousTitre }) => (
            <LivraisonFacture key={livraison.id} livraison={livraison} sousTitre={sousTitre} onFait={actualiser} />
          ))}
        </ul>
      )}

      <VenteDirecteSection dossierId={dossierId} onFait={actualiser} />
    </Carte>
  );
}

function LivraisonFacture({
  livraison,
  sousTitre,
  onFait,
}: {
  livraison: LivraisonAvecTout;
  sousTitre: string;
  onFait: () => void;
}) {
  const [envoi, setEnvoi] = useState(false);
  const surbrillance = useSurbrillance();
  const idFacture = livraison.facture ? `facture-${livraison.facture.id}` : undefined;

  async function facturer() {
    setEnvoi(true);
    await fetch(`/api/livraisons/${livraison.id}/facture`, { method: "POST" });
    setEnvoi(false);
    onFait();
  }

  return (
    <li
      id={idFacture}
      className={`rounded-lg border border-neutral-200 p-3 transition-shadow ${classesSurbrillance(idFacture, surbrillance)}`}
    >
      <span className="text-sm text-neutral-700">
        Livraison du {new Date(livraison.clotureeA ?? livraison.creeA).toLocaleDateString("fr-FR")} · {sousTitre}
      </span>

      {!livraison.facture ? (
        <div className="mt-2">
          <button
            onClick={facturer}
            disabled={envoi}
            className="rounded-md bg-neutral-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-neutral-700 disabled:opacity-50"
          >
            Facturer
          </button>
        </div>
      ) : (
        <FactureDetail facture={livraison.facture} onFait={onFait} />
      )}
    </li>
  );
}

function VenteDirecteSection({ dossierId, onFait }: { dossierId: string; onFait: () => void }) {
  return (
    <div className="mt-5 border-t border-neutral-100 pt-4">
      <h3 className="text-sm font-semibold text-neutral-800">Vente directe</h3>
      <p className="mt-1 text-xs text-neutral-500">
        Vendre un article au comptoir sans devis préalable — facture émise immédiatement.
      </p>

      <RechercheClientVenteDirecte dossierIdActuel={dossierId} />

      <PanierVenteDirecte dossierId={dossierId} onFait={onFait} />
    </div>
  );
}

type ModeRechercheClient = "nom" | "nss" | "exact";

function analyserRechercheClient(
  terme: string,
): { mode: ModeRechercheClient; valeur?: string; nom?: string; prenom?: string } {
  const t = terme.trim();
  if (t.includes(",")) {
    const [nomPart, prenomPart = ""] = t.split(",");
    return { mode: "exact", nom: nomPart.trim(), prenom: prenomPart.trim() };
  }
  if (/^\d+$/.test(t)) {
    return { mode: "nss", valeur: t };
  }
  return { mode: "nom", valeur: t };
}

type ClientAvecSolde = Personne & {
  soldeTotalTTC: number;
  reglementEnAttente: boolean;
  factureAlerteId: string | null;
};

function RechercheClientVenteDirecte({ dossierIdActuel }: { dossierIdActuel: string }) {
  const router = useRouter();
  const { activer, idActif } = useSurbrillance();
  const [terme, setTerme] = useState("");
  const [resultats, setResultats] = useState<ClientAvecSolde[] | null>(null);
  const [recherche, setRecherche] = useState(false);
  const [introuvable, setIntrouvable] = useState(false);
  const requeteEnCours = useRef(0);
  const champRecherche = useRef<HTMLInputElement>(null);

  // Curseur clignotant prêt à saisir dès que la carte Facturation en général
  // (pas une facture précise, qui a son propre champ à mettre en avant — voir
  // FactureDetail) devient active — que ce soit à l'atterrissage (hash au
  // montage) ou suite à un clic pendant que la page est déjà affichée.
  useEffect(() => {
    if (idActif === ID_CARTE_FACTURATION) {
      champRecherche.current?.focus();
    }
  }, [idActif]);

  useEffect(() => {
    const analyse = analyserRechercheClient(terme);

    const declenche =
      (analyse.mode === "nom" && (analyse.valeur?.length ?? 0) >= 3) ||
      (analyse.mode === "nss" && (analyse.valeur?.length ?? 0) >= 6) ||
      (analyse.mode === "exact" && Boolean(analyse.nom) && Boolean(analyse.prenom));

    if (!declenche) {
      setResultats(null);
      setIntrouvable(false);
      return;
    }

    setRecherche(true);
    const idRequete = ++requeteEnCours.current;
    const q = analyse.mode === "exact" ? analyse.nom! : analyse.valeur!;
    const minuteur = setTimeout(async () => {
      try {
        const reponse = await fetch(`/api/dossiers?q=${encodeURIComponent(q)}&avecSolde=1`);
        const data: ClientAvecSolde[] = await reponse.json();
        if (requeteEnCours.current !== idRequete) return;
        if (analyse.mode === "exact") {
          const trouve = data.filter((p) => p.prenom.toLowerCase().startsWith(analyse.prenom!.toLowerCase()));
          setResultats(trouve);
          setIntrouvable(trouve.length === 0);
        } else {
          setResultats(data);
          setIntrouvable(false);
        }
        setRecherche(false);
      } catch {
        if (requeteEnCours.current === idRequete) {
          setResultats([]);
          setRecherche(false);
        }
      }
    }, 200);

    return () => clearTimeout(minuteur);
  }, [terme]);

  function allerA(client: ClientAvecSolde, cible: string) {
    if (client.id === dossierIdActuel) {
      document.getElementById(cible)?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
      activer(cible);
      return;
    }
    router.push(`/dossiers/${client.id}#${cible}`);
  }

  function allerAuClient(client: ClientAvecSolde) {
    allerA(client, ID_CARTE_FACTURATION);
  }

  function allerALaFactureEnAttente(client: ClientAvecSolde, event: React.MouseEvent) {
    event.stopPropagation();
    allerA(client, client.factureAlerteId ? `facture-${client.factureAlerteId}` : ID_CARTE_FACTURATION);
  }

  return (
    <div className="mt-3">
      <h4 className="text-xs font-semibold text-neutral-700">Client</h4>
      <input
        ref={champRecherche}
        value={terme}
        onChange={(e) => setTerme(e.target.value)}
        placeholder="Nom, NSS (6 chiffres min.), ou « Nom, Prénom »…"
        className="mt-1 w-full rounded-full border border-neutral-300 px-3 py-1.5 text-xs"
      />

      {recherche && <p className="mt-1 text-xs text-neutral-400">Recherche…</p>}

      {resultats && resultats.length > 0 && (
        <ul className="mt-1 max-h-32 space-y-1 overflow-y-auto">
          {resultats.map((client) => (
            <li key={client.id}>
              <button
                onClick={() => allerAuClient(client)}
                className="flex w-full items-center justify-between gap-2 rounded-md border border-neutral-200 px-2 py-1 text-left text-xs hover:bg-neutral-50"
              >
                <span className="flex min-w-0 items-center gap-1.5">
                  <span className={`truncate font-medium ${client.soldeTotalTTC > 0 ? "text-red-600" : "text-emerald-600"}`}>
                    {client.prenom} {client.nom}
                  </span>
                  {client.soldeTotalTTC > 0 && (
                    <span className="shrink-0 text-red-600">— solde {formaterPrix(client.soldeTotalTTC)}</span>
                  )}
                </span>
                <span className="flex shrink-0 items-center gap-1.5">
                  {client.id === dossierIdActuel && <span className="text-neutral-400">· dossier actuel</span>}
                  {client.reglementEnAttente && (
                    <span
                      role="button"
                      onClick={(e) => allerALaFactureEnAttente(client, e)}
                      className="rounded-full bg-red-100 px-2 py-0.5 font-medium text-red-700 hover:bg-red-200"
                    >
                      ⚠️ Règlement en attente
                    </span>
                  )}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {introuvable && <PopupClientIntrouvable onFermer={() => setIntrouvable(false)} />}
    </div>
  );
}

function PopupClientIntrouvable({ onFermer }: { onFermer: () => void }) {
  const router = useRouter();
  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={onFermer}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-6"
    >
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-xs rounded-2xl bg-white p-5 text-center shadow-xl">
        <p className="text-sm text-neutral-800">Aucun client trouvé avec ce nom et ce prénom.</p>
        <p className="mt-1 text-sm font-semibold text-neutral-900">Créer un nouveau client ?</p>
        <div className="mt-4 flex gap-2">
          <button
            onClick={() => router.push("/dossiers/nouveau")}
            className="flex-1 rounded-lg bg-neutral-900 px-3 py-2 text-xs font-semibold text-white hover:bg-neutral-700"
          >
            Oui, créer
          </button>
          <button
            onClick={onFermer}
            className="flex-1 rounded-lg border border-neutral-300 px-3 py-2 text-xs font-semibold hover:bg-neutral-50"
          >
            Non, revenir
          </button>
        </div>
      </div>
    </div>
  );
}

type LigneVentDirecte = { produit: Produit; quantite: number };

function PanierVenteDirecte({ dossierId, onFait }: { dossierId: string; onFait: () => void }) {
  const [q, setQ] = useState("");
  const [resultats, setResultats] = useState<Produit[]>([]);
  const [recherche, setRecherche] = useState(false);
  const [panier, setPanier] = useState<LigneVentDirecte[]>([]);
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [succes, setSucces] = useState<string | null>(null);

  async function rechercher(event: React.FormEvent) {
    event.preventDefault();
    setRecherche(true);
    const reponse = await fetch(`/api/produits?q=${encodeURIComponent(q)}`);
    setResultats(await reponse.json());
    setRecherche(false);
  }

  function ajouterAuPanier(produit: Produit) {
    setSucces(null);
    setPanier((lignes) => {
      const existante = lignes.find((l) => l.produit.id === produit.id);
      if (existante) {
        return lignes.map((l) => (l.produit.id === produit.id ? { ...l, quantite: l.quantite + 1 } : l));
      }
      return [...lignes, { produit, quantite: 1 }];
    });
  }

  function changerQuantite(produitId: string, quantite: number) {
    if (quantite < 1) return;
    setPanier((lignes) => lignes.map((l) => (l.produit.id === produitId ? { ...l, quantite } : l)));
  }

  function retirerDuPanier(produitId: string) {
    setPanier((lignes) => lignes.filter((l) => l.produit.id !== produitId));
  }

  const total = panier.reduce((s, l) => s + l.produit.prixTTC * l.quantite, 0);

  async function vendreEtEncaisser() {
    if (panier.length === 0) return;
    setEnvoi(true);
    setErreur(null);
    setSucces(null);
    const reponse = await fetch(`/api/dossiers/${dossierId}/vente-directe`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lignes: panier.map((l) => ({ produitId: l.produit.id, quantite: l.quantite })) }),
    });
    setEnvoi(false);
    if (reponse.ok) {
      setPanier([]);
      setResultats([]);
      setQ("");
      setSucces("Vente enregistrée — encaissez ci-dessus.");
      onFait();
    } else {
      const data = await reponse.json().catch(() => ({}));
      setErreur(data.erreur ?? "Erreur.");
    }
  }

  return (
    <div className="mt-4">
      <h4 className="text-xs font-semibold text-neutral-700">Articles</h4>
      <form onSubmit={rechercher} className="mt-1 flex gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Référence, marque, modèle…"
          className="flex-1 rounded-full border border-neutral-300 px-3 py-1.5 text-xs"
        />
        <button
          type="submit"
          disabled={recherche}
          className="rounded-full bg-neutral-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-neutral-700 disabled:opacity-50"
        >
          {recherche ? "…" : "Chercher"}
        </button>
      </form>

      {resultats.length > 0 && (
        <ul className="mt-2 max-h-32 space-y-1 overflow-y-auto">
          {resultats.map((produit) => (
            <li
              key={produit.id}
              className="flex items-center justify-between gap-2 rounded-md border border-neutral-200 px-2 py-1 text-xs"
            >
              <span className="truncate">
                {produit.marque} {produit.modele} — {formaterPrix(produit.prixTTC)}
              </span>
              <button
                onClick={() => ajouterAuPanier(produit)}
                className="shrink-0 rounded-md bg-neutral-900 px-2 py-1 text-white hover:bg-neutral-700"
              >
                + Panier
              </button>
            </li>
          ))}
        </ul>
      )}

      {panier.length > 0 && (
        <div className="mt-3 rounded-md border border-neutral-200 p-2">
          <ul className="space-y-1.5">
            {panier.map(({ produit, quantite }) => (
              <li key={produit.id} className="flex items-center justify-between gap-2 text-xs">
                <span className="truncate text-neutral-700">
                  {produit.marque} {produit.modele}
                </span>
                <span className="flex shrink-0 items-center gap-2">
                  <input
                    type="number"
                    min={1}
                    value={quantite}
                    onChange={(e) => changerQuantite(produit.id, Number(e.target.value))}
                    className="w-12 rounded-md border border-neutral-300 px-1 py-0.5 text-xs"
                  />
                  <span className="font-medium text-neutral-900">{formaterPrix(produit.prixTTC * quantite)}</span>
                  <button onClick={() => retirerDuPanier(produit.id)} className="text-red-500 hover:underline">
                    Retirer
                  </button>
                </span>
              </li>
            ))}
          </ul>
          <div className="mt-2 flex items-center justify-between border-t border-neutral-100 pt-2 text-sm font-semibold text-neutral-900">
            <span>Total</span>
            <span>{formaterPrix(total)}</span>
          </div>
          <button
            onClick={vendreEtEncaisser}
            disabled={envoi}
            className="mt-2 w-full rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            {envoi ? "…" : "Vendre et encaisser"}
          </button>
        </div>
      )}

      {erreur && <p className="mt-2 text-xs text-red-600">{erreur}</p>}
      {succes && <p className="mt-2 text-xs text-emerald-700">{succes}</p>}
    </div>
  );
}

function FactureDetail({ facture, onFait }: { facture: FactureAvecTout; onFait: () => void }) {
  const [envoi, setEnvoi] = useState(false);
  const [montantPaiement, setMontantPaiement] = useState("");
  const [moyen, setMoyen] = useState("");
  const [montantAvoir, setMontantAvoir] = useState("");
  const [motifAvoir, setMotifAvoir] = useState("");
  const champMontant = useRef<HTMLInputElement>(null);
  const { idActif } = useSurbrillance();

  const solde = soldeRestantClient(facture);
  const enRetard = factureEnRetardClient(facture, solde);

  // Curseur clignotant directement dans le champ d'encaissement attendu
  // quand cette facture précise devient active (badge "Règlement en
  // attente" d'un autre dossier, ou clic dans le même dossier).
  useEffect(() => {
    if (idActif === `facture-${facture.id}`) {
      champMontant.current?.focus();
    }
  }, [idActif, facture.id]);

  async function ajouterPaiement() {
    const centimes = parserPrixEnCentimes(montantPaiement);
    if (centimes === null || centimes <= 0) return;
    setEnvoi(true);
    await fetch(`/api/factures/${facture.id}/paiements`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ montantTTC: centimes, moyen: moyen || undefined }),
    });
    setEnvoi(false);
    setMontantPaiement("");
    setMoyen("");
    onFait();
  }

  async function ajouterAvoir() {
    const centimes = parserPrixEnCentimes(montantAvoir);
    if (centimes === null || centimes <= 0) return;
    setEnvoi(true);
    await fetch(`/api/factures/${facture.id}/avoirs`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ montantTTC: centimes, motif: motifAvoir || undefined }),
    });
    setEnvoi(false);
    setMontantAvoir("");
    setMotifAvoir("");
    onFait();
  }

  async function envoyerRelance() {
    setEnvoi(true);
    await fetch(`/api/factures/${facture.id}/relance`, { method: "POST" });
    setEnvoi(false);
    onFait();
  }

  return (
    <div className="mt-2 rounded-md border border-neutral-100 bg-neutral-50 p-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-neutral-700">
          Facture : {LIBELLE_STATUT_FACTURE[facture.statut]} · {formaterPrix(facture.montantTTC)}
        </span>
        {enRetard && (
          <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">⚠️ Impayé</span>
        )}
      </div>

      <p className="mt-1 text-xs text-neutral-600">Solde restant : {formaterPrix(Math.max(0, solde))}</p>

      {(facture.paiements.length > 0 || facture.avoirs.length > 0) && (
        <ul className="mt-1 space-y-0.5 text-xs text-neutral-500">
          {facture.paiements.map((p) => (
            <li key={p.id}>
              + {formaterPrix(p.montantTTC)} encaissé{p.moyen ? ` (${p.moyen})` : ""} le{" "}
              {new Date(p.creeA).toLocaleDateString("fr-FR")}
            </li>
          ))}
          {facture.avoirs.map((a) => (
            <li key={a.id}>
              − {formaterPrix(a.montantTTC)} avoir{a.motif ? ` (${a.motif})` : ""} le{" "}
              {new Date(a.creeA).toLocaleDateString("fr-FR")}
            </li>
          ))}
        </ul>
      )}

      {facture.statut !== "SOLDEE" && (
        <div className="mt-2 space-y-2">
          <div className="flex items-center gap-2">
            <input
              ref={champMontant}
              value={montantPaiement}
              onChange={(e) => setMontantPaiement(e.target.value)}
              placeholder="Montant encaissé (€)"
              className="w-32 rounded-md border border-neutral-300 px-2 py-1 text-xs"
            />
            <input
              value={moyen}
              onChange={(e) => setMoyen(e.target.value)}
              placeholder="Moyen (CB, chèque…)"
              className="w-32 rounded-md border border-neutral-300 px-2 py-1 text-xs"
            />
            <button
              onClick={ajouterPaiement}
              disabled={envoi || !montantPaiement.trim()}
              className="rounded-md bg-emerald-600 px-3 py-1 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              Encaisser
            </button>
          </div>
          <div className="flex items-center gap-2">
            <input
              value={montantAvoir}
              onChange={(e) => setMontantAvoir(e.target.value)}
              placeholder="Montant avoir (€)"
              className="w-32 rounded-md border border-neutral-300 px-2 py-1 text-xs"
            />
            <input
              value={motifAvoir}
              onChange={(e) => setMotifAvoir(e.target.value)}
              placeholder="Motif"
              className="w-32 rounded-md border border-neutral-300 px-2 py-1 text-xs"
            />
            <button
              onClick={ajouterAvoir}
              disabled={envoi || !montantAvoir.trim()}
              className="rounded-md border border-neutral-300 px-3 py-1 text-xs font-medium hover:bg-neutral-50 disabled:opacity-50"
            >
              Émettre un avoir
            </button>
          </div>
          {enRetard && !facture.relanceEnvoyeeA && (
            <button
              onClick={envoyerRelance}
              disabled={envoi}
              className="rounded-md border border-red-300 px-3 py-1 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
            >
              Marquer une relance envoyée
            </button>
          )}
          {facture.relanceEnvoyeeA && (
            <p className="text-xs text-neutral-500">
              Relancé le {new Date(facture.relanceEnvoyeeA).toLocaleDateString("fr-FR")}.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

const LIBELLE_STATUT_SAV: Record<string, string> = {
  OUVERT: "Ouvert",
  DIAGNOSTIQUE: "Diagnostiqué",
  EN_TRAITEMENT: "En traitement",
  CLOTURE: "Clôturé",
};

const LIBELLE_DECISION_SAV: Record<string, string> = {
  REPARATION: "Réparation",
  ECHANGE: "Échange",
  REMBOURSEMENT: "Remboursement",
};

function SAVCarte({ propositions }: { propositions: PropositionAvecLignes[] }) {
  const router = useRouter();
  const livraisonsAvecCommande = propositions.flatMap((p) =>
    p.commandes
      .filter((c) => c.livraison && c.livraison.statut === "CLOTUREE")
      .map((c) => ({ commande: c, livraison: c.livraison as LivraisonAvecTout })),
  );

  return (
    <Carte
      titre="SAV"
      sousTitre="Un incident après livraison, rattaché au dossier — jamais un nouveau dossier déconnecté."
      emoji="🛠️"
      degrade="from-slate-500 to-neutral-700"
    >
      {livraisonsAvecCommande.length === 0 ? (
        <p className="text-sm text-neutral-500">Aucune livraison clôturée pour l&apos;instant.</p>
      ) : (
        <ul className="space-y-4">
          {livraisonsAvecCommande.map(({ commande, livraison }) => (
            <LivraisonSAV key={livraison.id} commande={commande} livraison={livraison} onFait={() => router.refresh()} />
          ))}
        </ul>
      )}
    </Carte>
  );
}

function LivraisonSAV({
  commande,
  livraison,
  onFait,
}: {
  commande: CommandeAvecTout;
  livraison: LivraisonAvecTout;
  onFait: () => void;
}) {
  const [ouverture, setOuverture] = useState(false);
  const [motif, setMotif] = useState("");
  const [ligneId, setLigneId] = useState("");
  const [envoi, setEnvoi] = useState(false);

  const ligneChoisie = commande.lignes.find((l) => l.id === ligneId) ?? null;
  const garantie = ligneChoisie ? garantieExpiree(ligneChoisie.produit.garantieMois, livraison.remiseA) : null;

  async function ouvrir() {
    if (!motif.trim()) return;
    setEnvoi(true);
    await fetch(`/api/livraisons/${livraison.id}/sav`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ motif, commandeLigneId: ligneId || undefined }),
    });
    setEnvoi(false);
    setMotif("");
    setLigneId("");
    setOuverture(false);
    onFait();
  }

  return (
    <li className="rounded-lg border border-neutral-200 p-3">
      <span className="text-sm text-neutral-700">
        Livraison du {new Date(livraison.clotureeA ?? livraison.creeA).toLocaleDateString("fr-FR")}
      </span>

      {livraison.savs.length > 0 && (
        <ul className="mt-2 space-y-2">
          {livraison.savs.map((sav) => (
            <SAVItem key={sav.id} sav={sav} onFait={onFait} />
          ))}
        </ul>
      )}

      {!ouverture ? (
        <button onClick={() => setOuverture(true)} className="mt-2 block text-xs font-medium text-neutral-700 hover:underline">
          + Ouvrir un SAV
        </button>
      ) : (
        <div className="mt-2 space-y-2 rounded-md border border-neutral-100 bg-neutral-50 p-2">
          <textarea
            value={motif}
            onChange={(e) => setMotif(e.target.value)}
            rows={2}
            placeholder="Description de l'incident (casse, gêne, panne, retour…)"
            className="w-full rounded-md border border-neutral-300 px-2 py-1 text-xs"
          />
          <select
            value={ligneId}
            onChange={(e) => setLigneId(e.target.value)}
            className="w-full rounded-md border border-neutral-300 px-2 py-1 text-xs"
          >
            <option value="">Toute la livraison</option>
            {commande.lignes.map((l) => (
              <option key={l.id} value={l.id}>
                {l.libelleProduit}
                {l.numeroSerie ? ` (SN ${l.numeroSerie})` : ""}
              </option>
            ))}
          </select>
          {garantie === true && (
            <p className="rounded-md bg-red-50 px-2 py-1 text-xs text-red-700">
              ⚠️ Garantie expirée — ne pas promettre de prise en charge gratuite.
            </p>
          )}
          {garantie === false && (
            <p className="rounded-md bg-emerald-50 px-2 py-1 text-xs text-emerald-700">✓ Encore sous garantie.</p>
          )}
          {garantie === null && ligneChoisie && (
            <p className="text-xs text-neutral-500">Durée de garantie non renseignée sur ce produit.</p>
          )}
          <div className="flex items-center gap-2">
            <button
              onClick={ouvrir}
              disabled={envoi || !motif.trim()}
              className="rounded-md bg-neutral-900 px-3 py-1 text-xs font-medium text-white hover:bg-neutral-700 disabled:opacity-50"
            >
              Ouvrir
            </button>
            <button onClick={() => setOuverture(false)} className="text-xs text-neutral-500 hover:underline">
              Annuler
            </button>
          </div>
        </div>
      )}
    </li>
  );
}

function SAVItem({ sav, onFait }: { sav: SAVAvecCommande; onFait: () => void }) {
  const [envoi, setEnvoi] = useState(false);
  const [diagnostic, setDiagnostic] = useState("");
  const [decision, setDecision] = useState("REPARATION");
  const [garantieConstructeur, setGarantieConstructeur] = useState(false);
  const [garantieMagasin, setGarantieMagasin] = useState(false);
  const [noteCloture, setNoteCloture] = useState("");

  async function diagnostiquer() {
    if (!diagnostic.trim()) return;
    setEnvoi(true);
    await fetch(`/api/sav/${sav.id}/diagnostiquer`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ diagnostic, decision, garantieConstructeur, garantieMagasin }),
    });
    setEnvoi(false);
    onFait();
  }

  async function traiter() {
    setEnvoi(true);
    await fetch(`/api/sav/${sav.id}/traiter`, { method: "POST" });
    setEnvoi(false);
    onFait();
  }

  async function cloturer() {
    setEnvoi(true);
    await fetch(`/api/sav/${sav.id}/cloturer`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ noteCloture: noteCloture || undefined }),
    });
    setEnvoi(false);
    onFait();
  }

  return (
    <li className="rounded-md border border-neutral-200 bg-white p-2 text-xs">
      <div className="flex items-center justify-between">
        <span className="font-medium text-neutral-800">{sav.motif}</span>
        <span className="rounded-full bg-neutral-100 px-2 py-0.5 font-medium text-neutral-700">
          {LIBELLE_STATUT_SAV[sav.statut]}
        </span>
      </div>

      {sav.statut === "OUVERT" && (
        <div className="mt-2 space-y-2">
          <textarea
            value={diagnostic}
            onChange={(e) => setDiagnostic(e.target.value)}
            rows={2}
            placeholder="Diagnostic"
            className="w-full rounded-md border border-neutral-300 px-2 py-1"
          />
          <select value={decision} onChange={(e) => setDecision(e.target.value)} className="w-full rounded-md border border-neutral-300 px-2 py-1">
            <option value="REPARATION">Réparation</option>
            <option value="ECHANGE">Échange</option>
            <option value="REMBOURSEMENT">Remboursement</option>
          </select>
          <label className="flex items-center gap-1">
            <input type="checkbox" checked={garantieConstructeur} onChange={(e) => setGarantieConstructeur(e.target.checked)} />
            Garantie constructeur
          </label>
          <label className="flex items-center gap-1">
            <input type="checkbox" checked={garantieMagasin} onChange={(e) => setGarantieMagasin(e.target.checked)} />
            Garantie magasin
          </label>
          <button
            onClick={diagnostiquer}
            disabled={envoi || !diagnostic.trim()}
            className="rounded-md bg-neutral-900 px-3 py-1 font-medium text-white hover:bg-neutral-700 disabled:opacity-50"
          >
            Enregistrer le diagnostic
          </button>
        </div>
      )}

      {sav.statut === "DIAGNOSTIQUE" && (
        <div className="mt-2 space-y-1">
          <p className="text-neutral-600">
            {sav.diagnostic} · Décision : {sav.decision ? LIBELLE_DECISION_SAV[sav.decision] : "—"}
          </p>
          <button
            onClick={traiter}
            disabled={envoi}
            className="rounded-md bg-neutral-900 px-3 py-1 font-medium text-white hover:bg-neutral-700 disabled:opacity-50"
          >
            Passer en traitement
          </button>
        </div>
      )}

      {sav.statut === "EN_TRAITEMENT" && (
        <div className="mt-2 space-y-2">
          <p className="text-neutral-600">Décision : {sav.decision ? LIBELLE_DECISION_SAV[sav.decision] : "—"}</p>
          <input
            value={noteCloture}
            onChange={(e) => setNoteCloture(e.target.value)}
            placeholder="Note de clôture (optionnel)"
            className="w-full rounded-md border border-neutral-300 px-2 py-1"
          />
          <button
            onClick={cloturer}
            disabled={envoi}
            className="rounded-md bg-emerald-600 px-3 py-1 font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            Clôturer
          </button>
        </div>
      )}

      {sav.statut === "CLOTURE" && (
        <div className="mt-2 space-y-1 text-neutral-500">
          <p>
            Décision : {sav.decision ? LIBELLE_DECISION_SAV[sav.decision] : "—"}
            {sav.noteCloture ? ` — ${sav.noteCloture}` : ""}
          </p>
          {sav.commandeRemplacement && (
            <p className="text-emerald-700">
              ↳ Commande de remplacement créée ({LIBELLE_STATUT_COMMANDE[sav.commandeRemplacement.statut]}) :{" "}
              {sav.commandeRemplacement.lignes.map((l) => l.libelleProduit).join(", ")}
            </p>
          )}
        </div>
      )}
    </li>
  );
}

function ConsentementsRgpd({ personne }: { personne: Personne }) {
  const router = useRouter();
  const [enCours, setEnCours] = useState<"email" | "sms" | null>(null);

  async function basculer(champ: "consentementEmail" | "consentementSms", valeurActuelle: boolean) {
    setEnCours(champ === "consentementEmail" ? "email" : "sms");
    await fetch(`/api/dossiers/${personne.id}/consentements`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [champ]: !valeurActuelle }),
    });
    setEnCours(null);
    router.refresh();
  }

  return (
    <Carte
      titre="Consentements RGPD"
      sousTitre="Modifiables à tout moment par le client, horodatés à chaque changement."
      emoji="🔐"
      degrade="from-sky-400 to-indigo-500"
    >
      <div className="space-y-3">
        <ConsentementLigne
          libelle="Email"
          actif={personne.consentementEmail}
          horodatage={personne.consentementEmailA}
          enCours={enCours === "email"}
          onBascule={() => basculer("consentementEmail", personne.consentementEmail)}
        />
        <ConsentementLigne
          libelle="SMS"
          actif={personne.consentementSms}
          horodatage={personne.consentementSmsA}
          enCours={enCours === "sms"}
          onBascule={() => basculer("consentementSms", personne.consentementSms)}
        />
      </div>
    </Carte>
  );
}

function ConsentementLigne({
  libelle,
  actif,
  horodatage,
  enCours,
  onBascule,
}: {
  libelle: string;
  actif: boolean;
  horodatage: Date | null;
  enCours: boolean;
  onBascule: () => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-neutral-800">{libelle}</p>
        {horodatage && (
          <p className="text-xs text-neutral-500">
            {actif ? "Consenti" : "Refusé"} le {new Date(horodatage).toLocaleString("fr-FR")}
          </p>
        )}
      </div>
      <button
        onClick={onBascule}
        disabled={enCours}
        className={`rounded-full px-4 py-1.5 text-xs font-medium transition disabled:opacity-50 ${
          actif ? "bg-emerald-600 text-white" : "bg-neutral-200 text-neutral-700"
        }`}
      >
        {enCours ? "…" : actif ? "Consenti" : "Non consenti"}
      </button>
    </div>
  );
}

function SyntheseBesoin({ personne }: { personne: Personne }) {
  const router = useRouter();
  const [texte, setTexte] = useState(personne.syntheseBesoin ?? "");
  const [envoi, setEnvoi] = useState<"brouillon" | "validation" | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const modifieDepuisValidation = texte !== (personne.syntheseBesoin ?? "");
  const estValidee = Boolean(personne.syntheseBesoinValideeA) && !modifieDepuisValidation;

  async function enregistrerBrouillon() {
    setEnvoi("brouillon");
    setMessage(null);
    await fetch(`/api/dossiers/${personne.id}/synthese`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ syntheseBesoin: texte }),
    });
    setEnvoi(null);
    setMessage("Brouillon enregistré — validation humaine requise avant d'être acté.");
    router.refresh();
  }

  async function valider() {
    setEnvoi("validation");
    setMessage(null);
    // Le validateur est l'utilisateur authentifié (session) — plus de saisie libre.
    const reponse = await fetch(`/api/dossiers/${personne.id}/synthese/valider`, {
      method: "POST",
    });
    setEnvoi(null);
    if (reponse.ok) {
      setMessage("Synthèse validée et actée dans le dossier.");
      router.refresh();
    } else {
      setMessage("Erreur lors de la validation.");
    }
  }

  return (
    <Carte
      titre="Synthèse besoin (mini-audit vocal)"
      sousTitre="Généré par IA, éditable, jamais enregistré définitivement sans validation humaine explicite."
      emoji="🎙️"
      degrade="from-fuchsia-400 to-purple-500"
    >
      <textarea
        value={texte}
        onChange={(e) => setTexte(e.target.value)}
        rows={5}
        placeholder="Habitudes, gêne, usage, attentes, budget, urgence, contexte de vie…"
        className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
      />

      <div className="mt-2 text-xs">
        {estValidee ? (
          <span className="font-medium text-emerald-600">
            ✓ Validée le {new Date(personne.syntheseBesoinValideeA!).toLocaleString("fr-FR")} par{" "}
            {personne.syntheseBesoinValideePar}
          </span>
        ) : (
          <span className="text-amber-700">Non validée — ne sera pas actée dans le dossier tant que non validée.</span>
        )}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          onClick={enregistrerBrouillon}
          disabled={envoi !== null}
          className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium hover:bg-neutral-50 disabled:opacity-50"
        >
          {envoi === "brouillon" ? "Enregistrement…" : "Enregistrer le brouillon"}
        </button>

        <button
          onClick={valider}
          disabled={envoi !== null || !texte.trim()}
          className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700 disabled:opacity-50"
        >
          {envoi === "validation" ? "Validation…" : "Valider la synthèse"}
        </button>
      </div>
      {message && <p className="mt-2 text-sm text-neutral-500">{message}</p>}
    </Carte>
  );
}

function JournalEvenements({ evenements }: { evenements: Evenement[] }) {
  return (
    <Carte
      titre="Journal d'événements"
      sousTitre="Qui a fait quoi, quand — jamais de modification silencieuse."
      emoji="🕰️"
      degrade="from-neutral-600 to-neutral-800"
    >
      {evenements.length === 0 ? (
        <p className="text-sm text-neutral-500">Aucun événement enregistré.</p>
      ) : (
        <ul className="space-y-2 text-sm">
          {evenements.map((evt) => (
            <li key={evt.id} className="flex items-center justify-between border-b border-neutral-100 pb-2">
              <span className="text-neutral-800">{evt.type}</span>
              <span className="text-xs text-neutral-400">
                {new Date(evt.survenuA).toLocaleString("fr-FR")} · {evt.acteur ?? "?"}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Carte>
  );
}
