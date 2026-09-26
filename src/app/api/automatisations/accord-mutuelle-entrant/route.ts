import { NextRequest, NextResponse } from "next/server";
import { traiterMailAccordMutuelle } from "@/lib/traitementMailAccordMutuelle";

/**
 * POST /api/automatisations/accord-mutuelle-entrant — webhook cible d'un
 * scénario Make qui surveille une boîte mail (Gmail ou Microsoft 365, selon
 * ce que l'opticien utilise — voir Super Admin > Boîtes mail tiers payant)
 * pour chaque nouveau mail avec pièce jointe. Reprend le contrat exact des
 * scénarios "Guichet Tiers Payants" déjà configurés dans Make (pris comme
 * modèle) : { from, subject, bodyText, messageId, receivedAt, attachments:
 * [{ fileName, contentType, contentBase64 }] }.
 *
 * Protégé par un secret partagé (pas d'authentification par session — Make
 * n'a pas de cookie navigateur) : voir ACCORD_MUTUELLE_WEBHOOK_SECRET.
 * Ne rejette jamais un mail non pertinent par une erreur HTTP — un scénario
 * Make généraliste (ex. "tout mail avec pièce jointe") enverra forcément du
 * bruit ; le tri fin (mots-clés, extraction, appariement) se fait ici,
 * silencieusement, voir lib/traitementMailAccordMutuelle.ts.
 */
export async function POST(request: NextRequest) {
  const secret = process.env.ACCORD_MUTUELLE_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json({ erreur: "ACCORD_MUTUELLE_WEBHOOK_SECRET n'est pas configuré sur le serveur." }, { status: 503 });
  }
  const autorisation = request.headers.get("authorization");
  if (autorisation !== `Bearer ${secret}`) {
    return NextResponse.json({ erreur: "Non autorisé." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body.subject !== "string" || typeof body.bodyText !== "string") {
    return NextResponse.json({ erreur: "Payload invalide — subject et bodyText requis." }, { status: 400 });
  }

  const attachments = Array.isArray(body.attachments)
    ? body.attachments.filter(
        (a: unknown): a is { fileName: string; contentType: string; contentBase64: unknown } =>
          Boolean(a && typeof a === "object" && "fileName" in a && "contentBase64" in a),
      )
    : [];

  const resultat = await traiterMailAccordMutuelle({
    from: typeof body.from === "string" ? body.from : "",
    subject: body.subject,
    bodyText: body.bodyText,
    messageId: typeof body.messageId === "string" ? body.messageId : undefined,
    attachments,
  });

  return NextResponse.json(resultat);
}
