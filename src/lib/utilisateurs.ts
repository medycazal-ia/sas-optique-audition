import { prisma } from "@/lib/prisma";
import { hacherMotDePasse } from "@/lib/auth";
import { emailEstSuperAdminParEnv, type SessionUtilisateur } from "@/lib/session-edge";

/**
 * Gestion des comptes collaborateur/directeur — logique partagée entre la
 * carte Utilisateurs (rôle DIRECTEUR, voit COLLABORATEUR/DIRECTEUR
 * uniquement) et la carte Super Admin (rôle SUPER_ADMIN, voit tout le
 * monde). Le rôle SUPER_ADMIN n'est JAMAIS attribuable ici, quelle que soit
 * la route appelante — voir prisma/schema.prisma pour pourquoi.
 */

const ROLES_ATTRIBUABLES = ["COLLABORATEUR", "DIRECTEUR"] as const;
export type RoleAttribuable = (typeof ROLES_ATTRIBUABLES)[number];

export function estRoleAttribuable(role: unknown): role is RoleAttribuable {
  return typeof role === "string" && (ROLES_ATTRIBUABLES as readonly string[]).includes(role);
}

/** Vrai si ce compte est reconnu super admin — jamais renvoyé à un directeur. */
export function estCompteSuperAdmin(u: { role: string; email: string }): boolean {
  return u.role === "SUPER_ADMIN" || emailEstSuperAdminParEnv(u.email);
}

export class ErreurUtilisateur extends Error {
  statut: number;
  constructor(message: string, statut = 400) {
    super(message);
    this.statut = statut;
  }
}

/**
 * Liste des comptes, sans jamais renvoyer le hash de mot de passe.
 * `inclureSuperAdmins: false` (carte Utilisateurs, DIRECTEUR) filtre les
 * comptes super admin — ni leur existence ni leurs informations ne
 * transitent alors par cette route.
 */
export async function listerUtilisateurs(inclureSuperAdmins: boolean) {
  const tous = await prisma.utilisateur.findMany({
    orderBy: { creeA: "asc" },
    omit: { motDePasseHash: true },
  });
  return inclureSuperAdmins ? tous : tous.filter((u) => !estCompteSuperAdmin(u));
}

type DonneesCreation = {
  nom: string;
  prenom: string;
  email: string;
  telephonePerso?: string | null;
  pseudo?: string | null;
  motDePasse: string;
  role: RoleAttribuable;
};

export async function creerUtilisateur(body: unknown) {
  const d = (body ?? {}) as Record<string, unknown>;
  const nom = typeof d.nom === "string" ? d.nom.trim() : "";
  const prenom = typeof d.prenom === "string" ? d.prenom.trim() : "";
  const email = typeof d.email === "string" ? d.email.trim().toLowerCase() : "";
  const telephonePerso = typeof d.telephonePerso === "string" ? d.telephonePerso.trim() || null : null;
  const pseudo = typeof d.pseudo === "string" ? d.pseudo.trim() || null : null;
  const motDePasse = typeof d.motDePasse === "string" ? d.motDePasse : "";
  const role = d.role;

  if (!nom || !prenom || !email || !email.includes("@")) {
    throw new ErreurUtilisateur("Nom, prénom et email valide sont requis.");
  }
  if (motDePasse.length < 8) {
    throw new ErreurUtilisateur("Mot de passe d'au moins 8 caractères requis.");
  }
  if (!estRoleAttribuable(role)) {
    throw new ErreurUtilisateur(`role doit être l'un de : ${ROLES_ATTRIBUABLES.join(", ")}`);
  }

  const donnees: DonneesCreation = { nom, prenom, email, telephonePerso, pseudo, motDePasse, role };

  const emailExistant = await prisma.utilisateur.findUnique({ where: { email: donnees.email } });
  if (emailExistant) {
    throw new ErreurUtilisateur("Cet email est déjà utilisé par un compte.", 409);
  }
  if (donnees.pseudo) {
    const pseudoExistant = await prisma.utilisateur.findUnique({ where: { pseudo: donnees.pseudo } });
    if (pseudoExistant) {
      throw new ErreurUtilisateur("Ce pseudo est déjà pris.", 409);
    }
  }

  const utilisateur = await prisma.utilisateur.create({
    data: {
      nom: donnees.nom,
      prenom: donnees.prenom,
      email: donnees.email,
      telephonePerso: donnees.telephonePerso,
      pseudo: donnees.pseudo,
      motDePasseHash: await hacherMotDePasse(donnees.motDePasse),
      role: donnees.role,
    },
    omit: { motDePasseHash: true },
  });

  return utilisateur;
}

/**
 * Récupère un utilisateur en s'assurant qu'il est bien dans le périmètre
 * autorisé de l'acteur : un DIRECTEUR ne trouve jamais un super admin
 * (404, comme s'il n'existait pas).
 */
async function trouverDansPerimetre(id: string, inclureSuperAdmins: boolean) {
  const utilisateur = await prisma.utilisateur.findUnique({ where: { id } });
  if (!utilisateur) return null;
  if (!inclureSuperAdmins && estCompteSuperAdmin(utilisateur)) return null;
  return utilisateur;
}

export async function modifierUtilisateur(id: string, body: unknown, inclureSuperAdmins: boolean) {
  const cible = await trouverDansPerimetre(id, inclureSuperAdmins);
  if (!cible) throw new ErreurUtilisateur("Utilisateur introuvable.", 404);

  const d = (body ?? {}) as Record<string, unknown>;
  const donnees: Record<string, unknown> = {};

  if (typeof d.nom === "string" && d.nom.trim()) donnees.nom = d.nom.trim();
  if (typeof d.prenom === "string" && d.prenom.trim()) donnees.prenom = d.prenom.trim();
  if (typeof d.telephonePerso === "string") donnees.telephonePerso = d.telephonePerso.trim() || null;
  if (typeof d.pseudo === "string") donnees.pseudo = d.pseudo.trim() || null;
  if (typeof d.email === "string" && d.email.trim()) {
    const email = d.email.trim().toLowerCase();
    if (!email.includes("@")) throw new ErreurUtilisateur("Email invalide.");
    donnees.email = email;
  }
  if (d.role !== undefined) {
    if (!estRoleAttribuable(d.role)) {
      throw new ErreurUtilisateur(`role doit être l'un de : ${ROLES_ATTRIBUABLES.join(", ")}`);
    }
    donnees.role = d.role;
  }
  if (typeof d.motDePasse === "string" && d.motDePasse) {
    if (d.motDePasse.length < 8) throw new ErreurUtilisateur("Mot de passe d'au moins 8 caractères requis.");
    donnees.motDePasseHash = await hacherMotDePasse(d.motDePasse);
  }

  if (Object.keys(donnees).length === 0) {
    throw new ErreurUtilisateur("Aucun champ valide à mettre à jour.");
  }

  try {
    return await prisma.utilisateur.update({ where: { id }, data: donnees, omit: { motDePasseHash: true } });
  } catch {
    throw new ErreurUtilisateur("Cet email ou ce pseudo est déjà utilisé par un autre compte.", 409);
  }
}

/**
 * Édition de son propre profil — accessible à tout compte connecté, quel
 * que soit son rôle (contrairement à modifierUtilisateur, réservé au
 * DIRECTEUR ou plus). Ne touche jamais au rôle, à actif ni à banni : ces
 * champs restent du seul ressort d'un directeur (ou du super admin).
 */
export async function modifierMonProfil(session: SessionUtilisateur, body: unknown) {
  const moi = await prisma.utilisateur.findUnique({ where: { id: session.id } });
  if (!moi) throw new ErreurUtilisateur("Compte introuvable.", 404);
  if (moi.banni) throw new ErreurUtilisateur("Ce compte est banni.", 403);

  const d = (body ?? {}) as Record<string, unknown>;
  const donnees: Record<string, unknown> = {};

  if (typeof d.nom === "string" && d.nom.trim()) donnees.nom = d.nom.trim();
  if (typeof d.prenom === "string" && d.prenom.trim()) donnees.prenom = d.prenom.trim();
  if (typeof d.telephonePerso === "string") donnees.telephonePerso = d.telephonePerso.trim() || null;
  if (typeof d.pseudo === "string") donnees.pseudo = d.pseudo.trim() || null;
  if (typeof d.email === "string" && d.email.trim()) {
    const email = d.email.trim().toLowerCase();
    if (!email.includes("@")) throw new ErreurUtilisateur("Email invalide.");
    donnees.email = email;
  }
  if (typeof d.motDePasse === "string" && d.motDePasse) {
    if (d.motDePasse.length < 8) throw new ErreurUtilisateur("Mot de passe d'au moins 8 caractères requis.");
    donnees.motDePasseHash = await hacherMotDePasse(d.motDePasse);
  }

  if (Object.keys(donnees).length === 0) {
    throw new ErreurUtilisateur("Aucun champ valide à mettre à jour.");
  }

  try {
    return await prisma.utilisateur.update({ where: { id: session.id }, data: donnees, omit: { motDePasseHash: true } });
  } catch {
    throw new ErreurUtilisateur("Cet email ou ce pseudo est déjà utilisé par un autre compte.", 409);
  }
}

export async function basculerActif(
  id: string,
  actif: boolean,
  session: SessionUtilisateur,
  inclureSuperAdmins: boolean,
) {
  const cible = await trouverDansPerimetre(id, inclureSuperAdmins);
  if (!cible) throw new ErreurUtilisateur("Utilisateur introuvable.", 404);
  if (cible.id === session.id) {
    throw new ErreurUtilisateur("Vous ne pouvez pas modifier votre propre statut actif/inactif.", 409);
  }
  if (cible.banni) {
    throw new ErreurUtilisateur("Ce compte est banni — ce statut ne peut plus être modifié.", 409);
  }
  return prisma.utilisateur.update({ where: { id }, data: { actif }, omit: { motDePasseHash: true } });
}

/**
 * Bannissement — volontairement sans contrepartie "débannir" : la décision
 * du fondateur est que ce blocage n'est jamais rétabli une fois posé (les
 * données et l'historique du compte restent consultables, mais la
 * connexion est perdue pour de bon).
 */
export async function bannirUtilisateur(
  id: string,
  motif: string,
  session: SessionUtilisateur,
  inclureSuperAdmins: boolean,
) {
  const cible = await trouverDansPerimetre(id, inclureSuperAdmins);
  if (!cible) throw new ErreurUtilisateur("Utilisateur introuvable.", 404);
  if (cible.id === session.id) {
    throw new ErreurUtilisateur("Vous ne pouvez pas bannir votre propre compte.", 409);
  }
  if (cible.banni) {
    throw new ErreurUtilisateur("Ce compte est déjà banni.", 409);
  }
  if (!motif.trim()) {
    throw new ErreurUtilisateur("Un motif est requis pour bannir un compte.");
  }
  return prisma.utilisateur.update({
    where: { id },
    data: { banni: true, actif: false, banniA: new Date(), banniMotif: motif.trim(), banniPar: session.email },
    omit: { motDePasseHash: true },
  });
}
