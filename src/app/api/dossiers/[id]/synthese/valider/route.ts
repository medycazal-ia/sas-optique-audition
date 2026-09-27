import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { journaliser } from "@/lib/evenements";
import { lireSession } from "@/lib/auth";
import { enregistrerFichier } from "@/lib/stockageFichiers";
import { genererAuditPdf } from "@/lib/auditPdf";
import {
  estVisionBesoin,
  estTraitementVerreBesoin,
  estMatiereMontureBesoin,
  estStyleBesoin,
  LIBELLES_VISION_BESOIN,
  LIBELLES_TRAITEMENT_VERRE_BESOIN,
  LIBELLES_MATIERE_MONTURE_BESOIN,
  LIBELLES_STYLE_BESOIN,
} from "@/lib/besoinsExprimes";

type RouteParams = { params: Promise<{ id: string }> };

// Nettoie un composant de nom de fichier : minuscules, accents retirés,
// tout ce qui n'est pas alphanumérique remplacé par "-".
function normaliserPourNomFichier(valeur: string): string {
  return valeur
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "x";
}

/**
 * POST /api/dossiers/:id/synthese/valider — validation humaine explicite,
 * seule action qui acte définitivement la synthèse besoin dans le dossier.
 * Le validateur est désormais l'utilisateur authentifié (plus de saisie
 * libre du nom) — l'identité vient de la session, pas d'un champ texte.
 *
 * Génère aussi un PDF de la synthèse et l'archive parmi les documents du
 * dossier (type SYNTHESE_BESOIN), nommé nom-prenom-date-propal.pdf — point
 * de départ tracé de la proposition commerciale. La transcription brute est
 * effacée à ce moment-là : une fois actée dans le PDF et les critères
 * structurés, elle n'a plus lieu de traîner et polluer une prochaine
 * conversation avec ce client.
 */
export async function POST(_request: NextRequest, { params }: RouteParams) {
  const session = await lireSession();
  if (!session) {
    return NextResponse.json({ erreur: "Non authentifié." }, { status: 401 });
  }
  const { id } = await params;

  const maintenant = new Date();
  const personne = await prisma.personne.update({
    where: { id },
    data: {
      syntheseBesoinValideeA: maintenant,
      syntheseBesoinValideePar: `${session.nom} <${session.email}>`,
      transcriptionBesoin: null,
    },
  });

  const chips: string[] = [];
  if (personne.visionBesoin && estVisionBesoin(personne.visionBesoin)) {
    chips.push(LIBELLES_VISION_BESOIN[personne.visionBesoin]);
  }
  for (const traitement of personne.traitementsVerreBesoin) {
    if (estTraitementVerreBesoin(traitement)) {
      chips.push(LIBELLES_TRAITEMENT_VERRE_BESOIN[traitement]);
    }
  }
  if (personne.matiereMontureBesoin && estMatiereMontureBesoin(personne.matiereMontureBesoin)) {
    chips.push(LIBELLES_MATIERE_MONTURE_BESOIN[personne.matiereMontureBesoin]);
  }
  for (const style of personne.styleBesoin) {
    if (estStyleBesoin(style)) {
      chips.push(LIBELLES_STYLE_BESOIN[style]);
    }
  }

  const pdf = await genererAuditPdf({
    prenom: personne.prenom,
    nom: personne.nom,
    date: maintenant,
    syntheseBesoin: personne.syntheseBesoin ?? "",
    chips,
  });

  const dateFichier = maintenant.toISOString().slice(0, 10);
  const nomFichier = `${normaliserPourNomFichier(personne.nom)}-${normaliserPourNomFichier(personne.prenom)}-${dateFichier}-propal.pdf`;
  const { cheminStockage } = await enregistrerFichier(id, nomFichier, Buffer.from(pdf));

  const document = await prisma.document.create({
    data: { personneId: id, type: "SYNTHESE_BESOIN", nomFichier, cheminStockage },
  });

  await journaliser({
    type: "synthese_besoin.validee",
    entite: "Personne",
    entiteId: id,
    personneId: id,
    acteur: session.email,
    donnees: { validePar: session.email, documentId: document.id, nomFichier },
  });

  return NextResponse.json(personne);
}
