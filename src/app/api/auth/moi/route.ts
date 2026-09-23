import { NextResponse } from "next/server";
import { lireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await lireSession();
  if (!session) {
    const amorceRequise = (await prisma.utilisateur.count()) === 0;
    return NextResponse.json({ session: null, amorceRequise });
  }
  return NextResponse.json({ session });
}
