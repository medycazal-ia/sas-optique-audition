-- CreateEnum
CREATE TYPE "StatutDemandeMutuelle" AS ENUM ('A_ENVOYER', 'ENVOYEE', 'EN_ATTENTE', 'ACCORD', 'REFUS');

-- AlterTable
ALTER TABLE "Personne" ADD COLUMN     "mutuelleNom" TEXT,
ADD COLUMN     "mutuelleNumeroAdherent" TEXT,
ADD COLUMN     "mutuelleRefuseeA" TIMESTAMP(3),
ADD COLUMN     "mutuelleRenseigneeA" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Proposition" ADD COLUMN     "resteAChargeTTC" INTEGER;

-- CreateTable
CREATE TABLE "DemandePriseEnCharge" (
    "id" TEXT NOT NULL,
    "creeA" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modifieA" TIMESTAMP(3) NOT NULL,
    "propositionId" TEXT NOT NULL,
    "personneId" TEXT NOT NULL,
    "statut" "StatutDemandeMutuelle" NOT NULL DEFAULT 'A_ENVOYER',
    "envoyeeA" TIMESTAMP(3),
    "reponseA" TIMESTAMP(3),
    "montantPriseEnChargeTTC" INTEGER,
    "motifRefus" TEXT,

    CONSTRAINT "DemandePriseEnCharge_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DemandePriseEnCharge_propositionId_idx" ON "DemandePriseEnCharge"("propositionId");

-- CreateIndex
CREATE INDEX "DemandePriseEnCharge_personneId_idx" ON "DemandePriseEnCharge"("personneId");

-- CreateIndex
CREATE INDEX "DemandePriseEnCharge_statut_idx" ON "DemandePriseEnCharge"("statut");

-- AddForeignKey
ALTER TABLE "DemandePriseEnCharge" ADD CONSTRAINT "DemandePriseEnCharge_propositionId_fkey" FOREIGN KEY ("propositionId") REFERENCES "Proposition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
