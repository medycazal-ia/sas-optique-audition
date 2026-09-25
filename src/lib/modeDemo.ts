"use client";

import { useEffect, useState } from "react";

/**
 * Bascule de vue "mode démo" — purement cosmétique, jamais une vraie
 * élévation/restriction de droits : un directeur ou super admin peut
 * prévisualiser instantanément ce qu'un rôle moins privilégié verrait
 * (masque les cartes/liens réservés), sans se déconnecter et sans que son
 * vrai rôle en base ne change. Les vraies routes API restent gouvernées
 * par la session réelle — cette bascule ne fait qu'afficher/masquer de
 * l'UI. Stockée en sessionStorage (par onglet, jamais partagée), pour
 * rester active en naviguant d'une page à l'autre pendant une démo.
 */

export type VueDemo = "reel" | "directeur" | "collaborateur";

const CLE_STOCKAGE = "sas-mode-demo-vue";

function lireVueStockee(): VueDemo {
  if (typeof window === "undefined") return "reel";
  const v = window.sessionStorage.getItem(CLE_STOCKAGE);
  return v === "directeur" || v === "collaborateur" ? v : "reel";
}

export function useModeDemo(estSuperAdminReel: boolean, estDirecteurReel: boolean) {
  const [vue, setVue] = useState<VueDemo>("reel");

  useEffect(() => {
    setVue(lireVueStockee());
  }, []);

  function definirVue(v: VueDemo) {
    setVue(v);
    window.sessionStorage.setItem(CLE_STOCKAGE, v);
    // Notifie les autres composants montés sur la même page (le storage
    // event natif ne se déclenche pas dans l'onglet qui écrit lui-même).
    window.dispatchEvent(new CustomEvent("sas-mode-demo-change"));
  }

  useEffect(() => {
    function surChangement() {
      setVue(lireVueStockee());
    }
    window.addEventListener("sas-mode-demo-change", surChangement);
    window.addEventListener("storage", surChangement);
    return () => {
      window.removeEventListener("sas-mode-demo-change", surChangement);
      window.removeEventListener("storage", surChangement);
    };
  }, []);

  // Une bascule ne peut jamais accorder PLUS que le rôle réel — seulement
  // simuler moins, pour prévisualiser un accès plus restreint.
  const estSuperAdminAffiche = vue === "reel" && estSuperAdminReel;
  const estDirecteurAffiche = vue === "reel" ? estDirecteurReel : vue === "directeur" && estSuperAdminReel;

  return { vue, definirVue, estSuperAdminAffiche, estDirecteurAffiche };
}
