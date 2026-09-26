"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { Utilisateur } from "@prisma/client";
import { FormulaireCreation, LigneUtilisateur, PopupStatutCompte } from "../utilisateurs/UtilisateursClient";
import { useMonProfil } from "@/lib/monProfil";
import PopupMonProfil from "@/components/PopupMonProfil";

type UtilisateurSansHash = Omit<Utilisateur, "motDePasseHash">;

/**
 * Carte Super Admin — design volontairement distinct (fond sombre, liseré
 * or) du reste de l'application : ce panneau est au-dessus de tout, y
 * compris des directeurs, et ne doit jamais être confondu visuellement
 * avec une carte de gestion courante. Conçu pour être copié tel quel
 * (composant + route + garde d'accès) dans d'autres projets — voir le
 * commentaire en tête de src/lib/utilisateurs.ts pour la logique associée.
 */
export default function SuperAdminClient({
  utilisateurs,
  sessionId,
  sessionEmail,
}: {
  utilisateurs: UtilisateurSansHash[];
  sessionId: string;
  sessionEmail: string;
}) {
  const router = useRouter();
  const [creation, setCreation] = useState(false);
  const [popup, setPopup] = useState<{ prenom: string; actif: boolean } | null>(null);
  const { nom: monNom, email: monEmail, profil: monProfil, setNom, setEmail, setProfil } = useMonProfil();
  const [editionProfil, setEditionProfil] = useState(false);

  function actualiser() {
    router.refresh();
  }

  const directeurs = utilisateurs.filter((u) => u.role === "DIRECTEUR");
  const autres = utilisateurs.filter((u) => u.role !== "DIRECTEUR");

  return (
    <div className="min-h-screen bg-neutral-950 pb-24 text-neutral-100">
      <div
        className="border-b border-amber-500/20 bg-gradient-to-b from-neutral-900 via-neutral-950 to-neutral-950 px-6 py-14"
        style={{
          backgroundImage:
            "radial-gradient(circle at 50% 0%, rgba(217,164,65,0.14), transparent 60%), radial-gradient(circle at 50% 0%, rgba(217,164,65,0.14), transparent 60%)",
        }}
      >
        <div className="mx-auto max-w-3xl">
          <Link href="/" className="text-sm text-neutral-500 underline hover:text-neutral-300">
            ← Accueil
          </Link>
        </div>
        <div className="mx-auto max-w-3xl text-center">
          <span className="text-5xl drop-shadow-[0_0_20px_rgba(217,164,65,0.5)]">👑</span>
          <p className="mt-3 text-xs font-semibold uppercase tracking-[0.3em] text-amber-400/80">
            Accès fondateur · au-dessus de tout le reste
          </p>
          <h1 className="mt-2 bg-gradient-to-r from-amber-200 via-amber-400 to-amber-200 bg-clip-text text-4xl font-extrabold text-transparent">
            Super Admin
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-sm text-neutral-400">
            Vue et contrôle sur l&apos;intégralité des comptes — collaborateurs, directeurs, et vous-même. Invisible et
            inaccessible pour tout autre rôle, quel que soit son niveau d&apos;accès.
          </p>
          <p className="mt-2 text-xs text-neutral-500">
            Connecté en tant que <span className="text-amber-300">{sessionEmail}</span>
            {monNom && (
              <>
                {" · "}
                <button onClick={() => setEditionProfil(true)} className="text-amber-400 underline hover:text-amber-300">
                  Modifier mon profil
                </button>
              </>
            )}
          </p>
        </div>
      </div>

      {editionProfil && monNom && (
        <PopupMonProfil
          nom={monNom}
          email={monEmail}
          profil={monProfil}
          onFermer={() => setEditionProfil(false)}
          onEnregistre={(nouveauNom, nouvelEmail, nouveauProfil) => {
            setNom(nouveauNom);
            setEmail(nouvelEmail);
            setProfil(nouveauProfil);
            setEditionProfil(false);
            actualiser();
          }}
        />
      )}

      <div className="mx-auto mt-10 w-full max-w-3xl px-6">
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => setCreation((v) => !v)}
            className="rounded-full bg-gradient-to-r from-amber-500 to-amber-600 px-6 py-3 text-sm font-bold text-neutral-950 shadow-[0_0_25px_rgba(217,164,65,0.35)] transition hover:scale-105"
          >
            {creation ? "Annuler" : "+ Nouveau compte"}
          </button>
          <Link
            href="/super-admin/modeles-documents"
            className="rounded-full bg-gradient-to-r from-amber-500 to-amber-600 px-6 py-3 text-sm font-bold text-neutral-950 shadow-[0_0_25px_rgba(217,164,65,0.35)] transition hover:scale-105"
          >
            📄 Modèles de documents
          </Link>
          <Link
            href="/super-admin/magasins"
            className="rounded-full bg-gradient-to-r from-amber-500 to-amber-600 px-6 py-3 text-sm font-bold text-neutral-950 shadow-[0_0_25px_rgba(217,164,65,0.35)] transition hover:scale-105"
          >
            🏬 Magasins
          </Link>
          <Link
            href="/super-admin/societe"
            className="rounded-full bg-gradient-to-r from-amber-500 to-amber-600 px-6 py-3 text-sm font-bold text-neutral-950 shadow-[0_0_25px_rgba(217,164,65,0.35)] transition hover:scale-105"
          >
            🏢 Société
          </Link>
        </div>

        {creation && (
          <div className="mt-4 rounded-2xl border border-amber-500/20 bg-neutral-900 p-1">
            <div className="rounded-[14px] bg-white p-4">
              <FormulaireCreation
                apiBase="/api/super-admin/utilisateurs"
                onCree={() => {
                  setCreation(false);
                  actualiser();
                }}
              />
            </div>
          </div>
        )}

        <SectionRole
          titre="Directeurs"
          utilisateurs={directeurs}
          sessionId={sessionId}
          onFait={actualiser}
          onStatut={(prenom, actif) => setPopup({ prenom, actif })}
        />
        <SectionRole
          titre="Collaborateurs & autres comptes"
          utilisateurs={autres}
          sessionId={sessionId}
          onFait={actualiser}
          onStatut={(prenom, actif) => setPopup({ prenom, actif })}
        />

        {utilisateurs.length === 0 && (
          <p className="mt-8 rounded-2xl border-2 border-dashed border-neutral-700 bg-neutral-900/50 p-10 text-center text-neutral-500">
            Aucun compte pour l&apos;instant.
          </p>
        )}
      </div>

      {popup && <PopupStatutCompte prenom={popup.prenom} actif={popup.actif} onFermer={() => setPopup(null)} />}
    </div>
  );
}

function SectionRole({
  titre,
  utilisateurs,
  sessionId,
  onFait,
  onStatut,
}: {
  titre: string;
  utilisateurs: UtilisateurSansHash[];
  sessionId: string;
  onFait: () => void;
  onStatut: (prenom: string, actif: boolean) => void;
}) {
  if (utilisateurs.length === 0) return null;
  return (
    <div className="mt-8">
      <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-amber-400/70">{titre}</h2>
      <ul className="space-y-3">
        {utilisateurs.map((u) => (
          <LigneUtilisateur
            key={u.id}
            utilisateur={u}
            estMoi={u.id === sessionId}
            apiBase="/api/super-admin/utilisateurs"
            onFait={onFait}
            onStatut={onStatut}
            badgeRole={
              u.role === "DIRECTEUR" ? (
                <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-semibold text-indigo-700">
                  Directeur
                </span>
              ) : u.role === "SUPER_ADMIN" ? (
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                  Super Admin
                </span>
              ) : undefined
            }
          />
        ))}
      </ul>
    </div>
  );
}
