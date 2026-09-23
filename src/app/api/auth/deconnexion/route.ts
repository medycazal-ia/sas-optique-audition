import { NextResponse } from "next/server";
import { detruireSession } from "@/lib/auth";

export async function POST() {
  await detruireSession();
  return NextResponse.json({ ok: true });
}
