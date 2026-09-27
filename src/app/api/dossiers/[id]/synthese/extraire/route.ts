import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/prisma";
import { lireSession } from "@/lib/auth";
import { creerClientAnthropic } from "@/lib/anthropicClient";
import {
  MATIERES_MONTURE_BESOIN,
  STYLES_BESOIN,
  TRAITEMENTS_VERRE_BESOIN,
  VISIONS_BESOIN,
  estMatiereMontureBesoin,
  estStyleBesoin,
  estTraitementVerreBesoin,
  estVisionBesoin,
} from "@/lib/besoinsExprimes";

type RouteParams = { params: Promise<{ id: string }> };

const MODELE = process.env.ANTHROPIC_MODELE_ASSISTANT_VOCAL ?? "claude-sonnet-5";

const OUTIL_EXTRACTION: Anthropic.Tool = {
  name: "extraire_besoins",
  description: "Extrait les besoins exprimés par le client pendant la conversation, selon la grille fournie.",
  input_schema: {
    type: "object",
    properties: {
      syntheseBesoin: {
        type: "string",
        description: "Synthèse courte (2-4 phrases) des besoins/habitudes/attentes exprimés, en français, pour relecture humaine.",
      },
      vision: { type: "string", enum: [...VISIONS_BESOIN], description: "Correction recherchée, si exprimée. Omettre si non mentionnée." },
      traitementsVerre: {
        type: "array",
        items: { type: "string", enum: [...TRAITEMENTS_VERRE_BESOIN] },
        description: "Traitements de verre demandés ou évoqués favorablement.",
      },
      matiereMonture: {
        type: "string",
        enum: [...MATIERES_MONTURE_BESOIN],
        description: "Matière de monture recherchée, si exprimée. Omettre si non mentionnée.",
      },
      style: {
        type: "array",
        items: { type: "string", enum: [...STYLES_BESOIN] },
        description: "Préférences de style de monture exprimées.",
      },
    },
    required: ["syntheseBesoin"],
  },
};

const PROMPT_SYSTEME = `Tu assistes un opticien/audioprothésiste à préparer une proposition commerciale après une conversation avec un client. On te donne la transcription brute (parfois imparfaitement reconnue) de cette conversation.

Appelle l'outil extraire_besoins avec, dans "syntheseBesoin", un résumé court et utile pour l'équipe, et dans les autres champs, UNIQUEMENT ce que le client a réellement exprimé (n'invente rien, ne déduis pas au-delà de ce qui est dit ; omets un champ plutôt que de deviner).`;

/**
 * POST /api/dossiers/:id/synthese/extraire — transforme une transcription
 * brute (voir composant SyntheseBesoin, enregistrement vocal continu) en
 * synthèse + besoins exprimés structurés (voir lib/besoinsExprimes.ts).
 * Ne sauvegarde RIEN : renvoie un brouillon que l'équipe relit et corrige
 * avant d'appeler PUT .../synthese (même principe que le reste du
 * mini-audit — jamais acté sans relecture humaine).
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  const session = await lireSession();
  if (!session) {
    return NextResponse.json({ erreur: "Non authentifié." }, { status: 401 });
  }
  const { id } = await params;

  const personne = await prisma.personne.findUnique({ where: { id }, select: { id: true } });
  if (!personne) {
    return NextResponse.json({ erreur: "Dossier introuvable." }, { status: 404 });
  }

  const body = await request.json().catch(() => ({}));
  const transcription = typeof body.transcription === "string" ? body.transcription.trim() : "";
  if (!transcription) {
    return NextResponse.json({ erreur: "transcription (texte) requise." }, { status: 400 });
  }

  const cleApi = process.env.ANTHROPIC_API_KEY;
  if (!cleApi) {
    return NextResponse.json({ erreur: "Extraction indisponible : ANTHROPIC_API_KEY n'est pas configurée sur le serveur." }, { status: 503 });
  }

  try {
    const client = creerClientAnthropic(cleApi);
    const reponse = await client.messages.create({
      model: MODELE,
      max_tokens: 700,
      system: PROMPT_SYSTEME,
      tools: [OUTIL_EXTRACTION],
      tool_choice: { type: "tool", name: "extraire_besoins" },
      messages: [{ role: "user", content: transcription }],
    });

    const bloc = reponse.content.find((b) => b.type === "tool_use");
    if (!bloc || bloc.type !== "tool_use") {
      return NextResponse.json({ erreur: "L'IA n'a pas produit d'extraction exploitable." }, { status: 502 });
    }

    const entree = bloc.input as {
      syntheseBesoin?: string;
      vision?: string;
      traitementsVerre?: string[];
      matiereMonture?: string;
      style?: string[];
    };

    return NextResponse.json({
      syntheseBesoin: typeof entree.syntheseBesoin === "string" ? entree.syntheseBesoin : "",
      visionBesoin: typeof entree.vision === "string" && estVisionBesoin(entree.vision) ? entree.vision : null,
      traitementsVerreBesoin: Array.isArray(entree.traitementsVerre) ? entree.traitementsVerre.filter(estTraitementVerreBesoin) : [],
      matiereMontureBesoin: typeof entree.matiereMonture === "string" && estMatiereMontureBesoin(entree.matiereMonture) ? entree.matiereMonture : null,
      styleBesoin: Array.isArray(entree.style) ? entree.style.filter(estStyleBesoin) : [],
    });
  } catch (e) {
    console.error("synthese/extraire — erreur :", e);
    return NextResponse.json({ erreur: e instanceof Error ? e.message : "Erreur inattendue lors de l'extraction." }, { status: 500 });
  }
}
