import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { googleCalendarConfigureEnv } from "@/lib/googleCalendarRdv";

/**
 * GET/PATCH /api/super-admin/rdv-demo — configuration de la prise de RDV
 * (durée des créneaux, plage horaire, jours ouvrés) et statut de connexion
 * Google. Protégée par le préfixe /api/super-admin du proxy.
 */
export async function GET() {
  const config = await prisma.configurationRdv.findUnique({ where: { id: "singleton" } });
  return NextResponse.json({
    variablesGoogleConfigurees: googleCalendarConfigureEnv(),
    connecte: Boolean(config?.googleRefreshToken),
    googleEmailCompte: config?.googleEmailCompte ?? null,
    connecteA: config?.connecteA ?? null,
    connectePar: config?.connectePar ?? null,
    dureeCreneauMinutes: config?.dureeCreneauMinutes ?? 30,
    heureDebut: config?.heureDebut ?? "09:00",
    heureFin: config?.heureFin ?? "18:00",
    joursOuvres: config?.joursOuvres ?? [1, 2, 3, 4, 5],
  });
}

export async function PATCH(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const donnees: Record<string, unknown> = {};

  if (typeof body.dureeCreneauMinutes === "number" && body.dureeCreneauMinutes > 0) {
    donnees.dureeCreneauMinutes = Math.round(body.dureeCreneauMinutes);
  }
  if (typeof body.heureDebut === "string" && /^\d{2}:\d{2}$/.test(body.heureDebut)) {
    donnees.heureDebut = body.heureDebut;
  }
  if (typeof body.heureFin === "string" && /^\d{2}:\d{2}$/.test(body.heureFin)) {
    donnees.heureFin = body.heureFin;
  }
  if (Array.isArray(body.joursOuvres) && body.joursOuvres.every((j: unknown) => typeof j === "number" && j >= 0 && j <= 6)) {
    donnees.joursOuvres = body.joursOuvres;
  }

  if (Object.keys(donnees).length === 0) {
    return NextResponse.json({ erreur: "Aucun champ valide fourni." }, { status: 400 });
  }

  const config = await prisma.configurationRdv.upsert({
    where: { id: "singleton" },
    create: { id: "singleton", ...donnees },
    update: donnees,
  });
  return NextResponse.json(config);
}
