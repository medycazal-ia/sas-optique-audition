import { prisma } from "@/lib/prisma";
import { valeursActives } from "@/lib/optique";
import { correctionVide, type CorrectionVerre } from "@/lib/correctionVerre";

/**
 * Préremplit la correction optique d'une ligne VERRE depuis la dernière
 * ordonnance OPTIQUE du dossier — valeurs actives (adaptation opticien si
 * elle existe, sinon prescription médecin, voir lib/optique.ts). Ne
 * concerne que la création de la ligne : une fois créée, la correction est
 * modifiable indépendamment de l'ordonnance (voir modèle PropositionLigne).
 * Renvoie une correction vide si le dossier n'a pas encore d'ordonnance
 * optique — jamais bloquant, jamais une erreur.
 */
export async function correctionActivePourPersonne(personneId: string): Promise<CorrectionVerre> {
  const ordonnance = await prisma.ordonnance.findFirst({
    where: { personneId, type: "OPTIQUE" },
    orderBy: { creeA: "desc" },
  });
  if (!ordonnance) return correctionVide();

  const { od, og } = valeursActives(ordonnance);
  return {
    sphereOD: od.sphere,
    cylindreOD: od.cylindre,
    axeOD: od.axe,
    additionOD: od.addition,
    sphereOG: og.sphere,
    cylindreOG: og.cylindre,
    axeOG: og.axe,
    additionOG: og.addition,
  };
}
