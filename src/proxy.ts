import { NextRequest, NextResponse } from "next/server";
import { NOM_COOKIE_SESSION, verifierJetonSession } from "@/lib/session-edge";

// Next.js 16 a renommé le fichier "middleware" en "proxy" (même mécanisme,
// nouveau nom — voir node_modules/next/dist/docs/.../proxy.md).
const PREFIXES_PROTEGES = ["/dossiers", "/api/dossiers"];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const estProtege = PREFIXES_PROTEGES.some(
    (prefixe) => pathname === prefixe || pathname.startsWith(`${prefixe}/`),
  );
  if (!estProtege) {
    return NextResponse.next();
  }

  const jeton = request.cookies.get(NOM_COOKIE_SESSION)?.value;
  const session = jeton ? await verifierJetonSession(jeton) : null;

  if (!session) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ erreur: "Non authentifié." }, { status: 401 });
    }
    const urlConnexion = new URL("/connexion", request.url);
    urlConnexion.searchParams.set("suite", pathname);
    return NextResponse.redirect(urlConnexion);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dossiers/:path*", "/api/dossiers/:path*"],
};
