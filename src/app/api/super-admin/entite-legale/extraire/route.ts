import { NextRequest, NextResponse } from "next/server";
import { lireSession, sessionEstSuperAdmin } from "@/lib/auth";
import { extraireEntiteLegale } from "@/lib/ocrEntiteLegale";

const TAILLE_MAX_OCTETS = 15 * 1024 * 1024;

/**
 * POST /api/super-admin/entite-legale/extraire — lit un document (facture,
 * devis, papier en-tête...) où apparaissent des mentions légales, par IA de
 * vision, pour préremplir le formulaire Societe OU la fiche complète d'un
 * Magasin (les deux partagent le même jeu de rubriques légales — voir
 * lib/ocrEntiteLegale.ts). Ne sauvegarde rien : le résultat est renvoyé au
 * formulaire appelant pour relecture/correction avant enregistrement. Le
 * fichier lui-même n'est jamais conservé — seul le texte qui en a été
 * extrait est renvoyé.
 */
export async function POST(request: NextRequest) {
  const session = await lireSession();
  if (!sessionEstSuperAdmin(session)) {
    return NextResponse.json({ erreur: "Non autorisé." }, { status: 403 });
  }

  const formulaire = await request.formData();
  const fichier = formulaire.get("fichier");
  if (!(fichier instanceof File)) {
    return NextResponse.json({ erreur: "Fichier manquant (champ \"fichier\")." }, { status: 400 });
  }
  if (fichier.size > TAILLE_MAX_OCTETS) {
    return NextResponse.json({ erreur: "Fichier trop volumineux (15 Mo max)." }, { status: 400 });
  }

  try {
    const contenu = Buffer.from(await fichier.arrayBuffer());
    const resultat = await extraireEntiteLegale(contenu, fichier.name);
    return NextResponse.json(resultat);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Échec de l'extraction OCR.";
    return NextResponse.json({ erreur: message }, { status: 502 });
  }
}
