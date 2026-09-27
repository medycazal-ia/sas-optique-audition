import { prisma } from "@/lib/prisma";

/**
 * Réservation "maison" pour /rdv-demo : Google ne permet de créer un agenda
 * ou un "Programme de rendez-vous" que depuis son interface web, jamais par
 * API — voir la discussion avec le fondateur. On construit donc ici la même
 * chose nous-mêmes, au-dessus de l'API Google Calendar standard (créer un
 * événement, lire les disponibilités), qui elle est bien accessible par API
 * une fois l'agenda du fondateur connecté via OAuth2 (voir
 * app/super-admin/rdv-demo/ et app/api/super-admin/rdv-demo/).
 *
 * Implémenté en appels HTTP directs (fetch) plutôt qu'avec le paquet
 * `googleapis` — l'API OAuth2 + Calendar utilisée ici (échange de code,
 * rafraîchissement de jeton, freeBusy, création d'événement) est simple, et
 * ça évite une dépendance lourde pour un besoin aussi ciblé.
 */

const GOOGLE_OAUTH_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_OAUTH_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_CALENDAR_API = "https://www.googleapis.com/calendar/v3";
const GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo";
const SCOPE_CALENDAR = "https://www.googleapis.com/auth/calendar";

/**
 * URL publique fixe du site — un URI de redirection OAuth2 doit correspondre
 * EXACTEMENT (caractère par caractère) à celui enregistré dans Google Cloud
 * Console, donc jamais le recalculer depuis la requête entrante
 * (request.nextUrl.origin) : Render (comme la plupart des hébergeurs)
 * termine le HTTPS en amont et transmet la requête en interne, et selon la
 * façon dont les en-têtes X-Forwarded-* sont interprétés, l'origine déduite
 * peut différer (schéma, casse...) de l'URL réellement publique — d'où le
 * "redirect_uri_mismatch" Google observé en pratique. SITE_URL permet de
 * migrer vers facilog.site sans toucher au code, une fois ce domaine
 * personnalisé branché sur Render.
 */
const SITE_URL = process.env.SITE_URL ?? "https://sas-optique-audition.onrender.com";

/** URI de redirection OAuth2 — doit être copié à l'identique dans Google Cloud Console (Identifiants > URI de redirection autorisés). */
export function redirectUriGoogleCalendar(): string {
  return `${SITE_URL}/api/super-admin/rdv-demo/callback`;
}

// Fuseau fixe de l'activité (pas encore configurable par écran) — toutes les
// heures d'ouverture de ConfigurationRdv (heureDebut/heureFin) s'entendent
// dans ce fuseau, jamais en UTC serveur.
const FUSEAU_ACTIVITE = "Europe/Paris";

export function googleCalendarConfigureEnv(): boolean {
  return Boolean(process.env.GOOGLE_CALENDAR_CLIENT_ID && process.env.GOOGLE_CALENDAR_CLIENT_SECRET);
}

/** URL vers laquelle rediriger le super admin pour autoriser l'accès à son agenda — null si les identifiants OAuth ne sont pas encore configurés. */
export function urlAutorisationGoogle(redirectUri: string): string | null {
  const clientId = process.env.GOOGLE_CALENDAR_CLIENT_ID;
  if (!clientId) return null;
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: SCOPE_CALENDAR,
    access_type: "offline",
    prompt: "consent",
  });
  return `${GOOGLE_OAUTH_AUTH_URL}?${params.toString()}`;
}

type ReponseJetons = { access_token: string; refresh_token?: string; expires_in: number };

async function echangerCodeContreJetons(code: string, redirectUri: string): Promise<ReponseJetons> {
  const clientId = process.env.GOOGLE_CALENDAR_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CALENDAR_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("Google Calendar non configuré (GOOGLE_CALENDAR_CLIENT_ID/SECRET manquants).");
  }
  const reponse = await fetch(GOOGLE_OAUTH_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });
  if (!reponse.ok) {
    throw new Error(`Échec de l'échange du code Google (${reponse.status}) : ${await reponse.text()}`);
  }
  return reponse.json();
}

async function emailDuCompte(accessToken: string): Promise<string | null> {
  const reponse = await fetch(GOOGLE_USERINFO_URL, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!reponse.ok) return null;
  const donnees = (await reponse.json()) as { email?: string };
  return donnees.email ?? null;
}

/**
 * Termine la connexion OAuth2 : échange le code d'autorisation, récupère le
 * jeton de rafraîchissement (le seul qu'on conserve — l'access token expire
 * en une heure et se régénère à chaque usage, voir accessTokenValide) et
 * l'enregistre dans ConfigurationRdv. Appelé une seule fois par
 * app/api/super-admin/rdv-demo/callback/route.ts.
 */
export async function finaliserConnexionGoogle(code: string, redirectUri: string, connectePar: string) {
  const jetons = await echangerCodeContreJetons(code, redirectUri);
  if (!jetons.refresh_token) {
    // Google ne renvoie un refresh_token que sur un premier consentement
    // (ou après révocation) — sans lui, impossible de rafraîchir l'accès
    // plus tard, il faut recommencer la connexion depuis zéro.
    throw new Error(
      "Google n'a pas renvoyé de jeton de rafraîchissement — révoquez l'accès existant (myaccount.google.com/permissions) puis reconnectez-vous.",
    );
  }
  const email = await emailDuCompte(jetons.access_token);

  await prisma.configurationRdv.upsert({
    where: { id: "singleton" },
    create: {
      id: "singleton",
      googleRefreshToken: jetons.refresh_token,
      googleEmailCompte: email,
      connecteA: new Date(),
      connectePar,
    },
    update: {
      googleRefreshToken: jetons.refresh_token,
      googleEmailCompte: email,
      connecteA: new Date(),
      connectePar,
    },
  });
}

async function accessTokenValide(refreshToken: string): Promise<string> {
  const clientId = process.env.GOOGLE_CALENDAR_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CALENDAR_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("Google Calendar non configuré (GOOGLE_CALENDAR_CLIENT_ID/SECRET manquants).");
  }
  const reponse = await fetch(GOOGLE_OAUTH_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "refresh_token",
    }),
  });
  if (!reponse.ok) {
    throw new Error(`Impossible de rafraîchir l'accès à Google Calendar (${reponse.status}).`);
  }
  const donnees = (await reponse.json()) as { access_token: string };
  return donnees.access_token;
}

// --- Calcul des créneaux, dans le fuseau de l'activité (Europe/Paris) ---

/** Décalage (en minutes) entre l'heure "murale" à Paris et UTC pour cet instant précis — gère automatiquement l'heure d'été/hiver, sans dépendance de fuseaux horaires. */
function decalageParisEnMinutes(instant: Date): number {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone: FUSEAU_ACTIVITE,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const parties = dtf.formatToParts(instant).reduce<Record<string, string>>((acc, p) => {
    acc[p.type] = p.value;
    return acc;
  }, {});
  const commeUtc = Date.UTC(
    Number(parties.year),
    Number(parties.month) - 1,
    Number(parties.day),
    Number(parties.hour),
    Number(parties.minute),
    Number(parties.second),
  );
  return Math.round((commeUtc - instant.getTime()) / 60000);
}

/** Convertit une date/heure "murale" à Paris (ex. 2026-10-01 09:00) en instant UTC réel. */
function parisVersUtc(annee: number, mois: number, jour: number, heure: number, minute: number): Date {
  const approximation = new Date(Date.UTC(annee, mois - 1, jour, heure, minute));
  const decalage = decalageParisEnMinutes(approximation);
  return new Date(approximation.getTime() - decalage * 60000);
}

function heureVersMinutes(heure: string): number {
  const [h, m] = heure.split(":").map(Number);
  return h * 60 + (m || 0);
}

async function periodesOccupees(
  accessToken: string,
  calendarId: string,
  debut: Date,
  fin: Date,
): Promise<{ start: string; end: string }[]> {
  const reponse = await fetch(`${GOOGLE_CALENDAR_API}/freeBusy`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ timeMin: debut.toISOString(), timeMax: fin.toISOString(), items: [{ id: calendarId }] }),
  });
  if (!reponse.ok) {
    throw new Error(`Échec de la lecture des disponibilités Google (${reponse.status}).`);
  }
  const donnees = (await reponse.json()) as { calendars?: Record<string, { busy?: { start: string; end: string }[] }> };
  return donnees.calendars?.[calendarId]?.busy ?? [];
}

function seChevauchent(aDebut: number, aFin: number, bDebut: number, bFin: number): boolean {
  return aDebut < bFin && bDebut < aFin;
}

export type CreneauRdv = { debut: string; fin: string }; // ISO 8601

/**
 * Créneaux disponibles sur les `joursAvenir` prochains jours (ouvrés selon
 * la configuration), en excluant ceux déjà occupés sur l'agenda connecté et
 * ceux commençant dans moins de `delaiMinimumHeures` heures.
 */
export async function creneauxDisponibles(joursAvenir = 14, delaiMinimumHeures = 2): Promise<CreneauRdv[]> {
  const config = await prisma.configurationRdv.findUnique({ where: { id: "singleton" } });
  if (!config?.googleRefreshToken) return [];

  const accessToken = await accessTokenValide(config.googleRefreshToken);
  const maintenant = new Date();
  const auPlusTot = new Date(maintenant.getTime() + delaiMinimumHeures * 3600_000);

  const minutesDebut = heureVersMinutes(config.heureDebut);
  const minutesFin = heureVersMinutes(config.heureFin);
  const jourSet = new Set(config.joursOuvres);

  // Fenêtre de recherche large (minuit à minuit, Paris) pour la requête freeBusy.
  const fenetreDebut = parisVersUtc(
    maintenant.getUTCFullYear(),
    maintenant.getUTCMonth() + 1,
    maintenant.getUTCDate(),
    0,
    0,
  );
  const fenetreFin = new Date(fenetreDebut.getTime() + (joursAvenir + 1) * 86_400_000);
  const occupees = await periodesOccupees(accessToken, config.googleCalendarId, fenetreDebut, fenetreFin);
  const occupeesMs = occupees.map((p) => ({ debut: new Date(p.start).getTime(), fin: new Date(p.end).getTime() }));

  const creneaux: CreneauRdv[] = [];
  for (let i = 0; i < joursAvenir; i++) {
    const jour = new Date(fenetreDebut.getTime() + i * 86_400_000);
    const jourSemaine = jour.getUTCDay();
    if (!jourSet.has(jourSemaine)) continue;

    // On reconstruit la date "murale" Paris de ce jour-là (pas garanti égale
    // à jour.getUTCDate() près d'un changement d'heure, mais suffisant pour
    // une granularité de créneaux, pas de calcul financier).
    const partiesJour = new Intl.DateTimeFormat("en-US", {
      timeZone: FUSEAU_ACTIVITE,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    })
      .formatToParts(jour)
      .reduce<Record<string, string>>((acc, p) => {
        acc[p.type] = p.value;
        return acc;
      }, {});
    const annee = Number(partiesJour.year);
    const mois = Number(partiesJour.month);
    const jourDuMois = Number(partiesJour.day);

    for (let minutes = minutesDebut; minutes + config.dureeCreneauMinutes <= minutesFin; minutes += config.dureeCreneauMinutes) {
      const debut = parisVersUtc(annee, mois, jourDuMois, Math.floor(minutes / 60), minutes % 60);
      const fin = new Date(debut.getTime() + config.dureeCreneauMinutes * 60000);
      if (debut < auPlusTot) continue;
      const occupe = occupeesMs.some((o) => seChevauchent(debut.getTime(), fin.getTime(), o.debut, o.fin));
      if (occupe) continue;
      creneaux.push({ debut: debut.toISOString(), fin: fin.toISOString() });
    }
  }
  return creneaux;
}

export type ReservationRdv = {
  debut: string;
  fin: string;
  prenom: string;
  nom: string;
  email: string;
  telephone?: string;
  message?: string;
};

/**
 * Revalide que le créneau est toujours libre (au cas où deux visiteurs
 * réservent en même temps) puis crée l'événement sur l'agenda connecté —
 * Google envoie lui-même l'invitation par email au visiteur
 * (sendUpdates=all).
 */
export async function reserverCreneau(params: ReservationRdv): Promise<{ id: string; htmlLink?: string }> {
  const config = await prisma.configurationRdv.findUnique({ where: { id: "singleton" } });
  if (!config?.googleRefreshToken) {
    throw new Error("La prise de rendez-vous n'est pas encore configurée.");
  }
  const accessToken = await accessTokenValide(config.googleRefreshToken);

  const debut = new Date(params.debut);
  const fin = new Date(params.fin);
  const occupees = await periodesOccupees(accessToken, config.googleCalendarId, debut, fin);
  const dejaPris = occupees.some((o) => seChevauchent(debut.getTime(), fin.getTime(), new Date(o.start).getTime(), new Date(o.end).getTime()));
  if (dejaPris) {
    throw new Error("Ce créneau vient d'être réservé par quelqu'un d'autre — merci d'en choisir un autre.");
  }

  const description = [
    `Démo FACILOG demandée via facilog.site.`,
    `Contact : ${params.prenom} ${params.nom} — ${params.email}${params.telephone ? ` — ${params.telephone}` : ""}`,
    params.message ? `Message : ${params.message}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  const reponse = await fetch(
    `${GOOGLE_CALENDAR_API}/calendars/${encodeURIComponent(config.googleCalendarId)}/events?sendUpdates=all`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        summary: `Démo FACILOG — ${params.prenom} ${params.nom}`,
        description,
        start: { dateTime: debut.toISOString(), timeZone: FUSEAU_ACTIVITE },
        end: { dateTime: fin.toISOString(), timeZone: FUSEAU_ACTIVITE },
        attendees: [{ email: params.email, displayName: `${params.prenom} ${params.nom}` }],
      }),
    },
  );
  if (!reponse.ok) {
    throw new Error(`Échec de la création du rendez-vous (${reponse.status}) : ${await reponse.text()}`);
  }
  return reponse.json();
}
