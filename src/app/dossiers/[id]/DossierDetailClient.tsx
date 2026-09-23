"use client";

import { useRef, useState } from "react";
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
  Proposition,
  PropositionLigne,
} from "@prisma/client";
import type { PieceRequise } from "@/lib/completude";
import { formaterPrix, parserPrixEnCentimes } from "@/lib/argent";
import Carrousel from "@/components/Carrousel";

type PersonneAvecRelations = Personne & {
  documents: Document[];
  ordonnances: Ordonnance[];
  evenements: Evenement[];
};

type FactureAvecTout = Facture & { paiements: Paiement[]; avoirs: Avoir[] };

type LivraisonAvecFacture = Livraison & { facture: FactureAvecTout | null };

type CommandeAvecTout = Commande & { lignes: CommandeLigne[]; livraison: LivraisonAvecFacture | null };

type PropositionAvecLignes = Proposition & {
  lignes: PropositionLigne[];
  demandes: DemandePriseEnCharge[];
  commandes: CommandeAvecTout[];
};

export default function DossierDetailClient({
  personne,
  completude,
  propositions,
}: {
  personne: PersonneAvecRelations;
  completude: PieceRequise[];
  propositions: PropositionAvecLignes[];
}) {
  return (
    <div className="mt-8">
      <Carrousel>
        <InformationsPersonnelles personne={personne} />
        <Completude dossierId={personne.id} completude={completude} documents={personne.documents} />
        <Propositions dossierId={personne.id} propositions={propositions} />
        <MutuelleEtTiersPayant personne={personne} propositions={propositions} />
        <CommandeEtLivraison propositions={propositions} />
        <FacturationEtFinancement propositions={propositions} />
        <ConsentementsRgpd personne={personne} />
        <SyntheseBesoin personne={personne} />
        <JournalEvenements evenements={personne.evenements} />
      </Carrousel>
    </div>
  );
}

function Carte({
  titre,
  sousTitre,
  emoji,
  degrade,
  children,
}: {
  titre: string;
  sousTitre?: string;
  emoji: string;
  degrade: string;
  children: React.ReactNode;
}) {
  return (
    <section className="anim-pop flex h-[520px] w-[85vw] max-w-[420px] flex-col overflow-hidden rounded-[28px] border border-neutral-200 bg-white shadow-lg">
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
  const [champs, setChamps] = useState({
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

  return (
    <Carte
      titre="Coordonnées"
      sousTitre="Lues par les modules Devis, Mutuelle et Facturation — jamais ressaisies ailleurs."
      emoji="📇"
      degrade="from-orange-400 to-amber-500"
    >
      <div className="grid gap-3 sm:grid-cols-2">
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
      <div className="mt-4 flex items-center gap-3">
        <button
          onClick={enregistrer}
          disabled={envoi}
          className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700 disabled:opacity-50"
        >
          {envoi ? "Enregistrement…" : "Enregistrer"}
        </button>
        {message && <span className="text-sm text-neutral-500">{message}</span>}
      </div>
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

function FacturationEtFinancement({ propositions }: { propositions: PropositionAvecLignes[] }) {
  const router = useRouter();
  const livraisonsClotureesFacturables = propositions.flatMap((p) =>
    p.commandes
      .filter((c) => c.livraison && c.livraison.statut === "CLOTUREE")
      .map((c) => ({ livraison: c.livraison as LivraisonAvecFacture, proposition: p })),
  );

  return (
    <Carte
      titre="Facturation & financement"
      sousTitre="Le montant reprend automatiquement le reste à charge validé par la mutuelle — jamais de recalcul manuel."
      emoji="💳"
      degrade="from-amber-400 to-rose-500"
    >
      {livraisonsClotureesFacturables.length === 0 ? (
        <p className="text-sm text-neutral-500">Aucune livraison clôturée à facturer pour l&apos;instant.</p>
      ) : (
        <ul className="space-y-4">
          {livraisonsClotureesFacturables.map(({ livraison, proposition }) => (
            <LivraisonFacture
              key={livraison.id}
              livraison={livraison}
              proposition={proposition}
              onFait={() => router.refresh()}
            />
          ))}
        </ul>
      )}
    </Carte>
  );
}

function LivraisonFacture({
  livraison,
  proposition,
  onFait,
}: {
  livraison: LivraisonAvecFacture;
  proposition: PropositionAvecLignes;
  onFait: () => void;
}) {
  const [envoi, setEnvoi] = useState(false);

  async function facturer() {
    setEnvoi(true);
    await fetch(`/api/livraisons/${livraison.id}/facture`, { method: "POST" });
    setEnvoi(false);
    onFait();
  }

  return (
    <li className="rounded-lg border border-neutral-200 p-3">
      <span className="text-sm text-neutral-700">
        Livraison du {new Date(livraison.clotureeA ?? livraison.creeA).toLocaleDateString("fr-FR")} · proposition du{" "}
        {new Date(proposition.creeA).toLocaleDateString("fr-FR")}
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

function FactureDetail({ facture, onFait }: { facture: FactureAvecTout; onFait: () => void }) {
  const [envoi, setEnvoi] = useState(false);
  const [montantPaiement, setMontantPaiement] = useState("");
  const [moyen, setMoyen] = useState("");
  const [montantAvoir, setMontantAvoir] = useState("");
  const [motifAvoir, setMotifAvoir] = useState("");

  const solde = soldeRestantClient(facture);
  const enRetard = factureEnRetardClient(facture, solde);

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
