-- CreateEnum
CREATE TYPE "StatutSAV" AS ENUM ('OUVERT', 'DIAGNOSTIQUE', 'EN_TRAITEMENT', 'CLOTURE');

-- CreateEnum
CREATE TYPE "DecisionSAV" AS ENUM ('REPARATION', 'ECHANGE', 'REMBOURSEMENT');

-- DropForeignKey
ALTER TABLE "public"."Commande" DROP CONSTRAINT "Commande_propositionId_fkey";

-- AlterTable
ALTER TABLE "Commande" ADD COLUMN     "savId" TEXT,
ALTER COLUMN "propositionId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Produit" ADD COLUMN     "garantieMois" INTEGER;

-- CreateTable
CREATE TABLE "SAV" (
    "id" TEXT NOT NULL,
    "creeA" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modifieA" TIMESTAMP(3) NOT NULL,
    "livraisonId" TEXT NOT NULL,
    "commandeLigneId" TEXT,
    "personneId" TEXT NOT NULL,
    "statut" "StatutSAV" NOT NULL DEFAULT 'OUVERT',
    "motif" TEXT NOT NULL,
    "diagnostiqueA" TIMESTAMP(3),
    "diagnostic" TEXT,
    "decision" "DecisionSAV",
    "garantieConstructeur" BOOLEAN NOT NULL DEFAULT false,
    "garantieMagasin" BOOLEAN NOT NULL DEFAULT false,
    "traitementA" TIMESTAMP(3),
    "clotureA" TIMESTAMP(3),
    "noteCloture" TEXT,

    CONSTRAINT "SAV_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SAV_livraisonId_idx" ON "SAV"("livraisonId");

-- CreateIndex
CREATE INDEX "SAV_personneId_idx" ON "SAV"("personneId");

-- CreateIndex
CREATE INDEX "SAV_statut_idx" ON "SAV"("statut");

-- CreateIndex
CREATE UNIQUE INDEX "Commande_savId_key" ON "Commande"("savId");

-- CreateIndex
CREATE INDEX "Commande_savId_idx" ON "Commande"("savId");

-- AddForeignKey
ALTER TABLE "Commande" ADD CONSTRAINT "Commande_propositionId_fkey" FOREIGN KEY ("propositionId") REFERENCES "Proposition"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Commande" ADD CONSTRAINT "Commande_savId_fkey" FOREIGN KEY ("savId") REFERENCES "SAV"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SAV" ADD CONSTRAINT "SAV_livraisonId_fkey" FOREIGN KEY ("livraisonId") REFERENCES "Livraison"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SAV" ADD CONSTRAINT "SAV_commandeLigneId_fkey" FOREIGN KEY ("commandeLigneId") REFERENCES "CommandeLigne"("id") ON DELETE SET NULL ON UPDATE CASCADE;

