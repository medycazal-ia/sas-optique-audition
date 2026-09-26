-- CreateEnum
CREATE TYPE "RangMutuelle" AS ENUM ('PRINCIPALE', 'SECONDAIRE');

-- AlterTable
ALTER TABLE "DemandePriseEnCharge" ADD COLUMN     "codePaiement" TEXT,
ADD COLUMN     "rang" "RangMutuelle" NOT NULL DEFAULT 'PRINCIPALE',
ADD COLUMN     "recuLeA" TIMESTAMP(3),
ADD COLUMN     "recuPar" TEXT;

-- AlterTable
ALTER TABLE "Personne" ADD COLUMN     "mutuelle2Nom" TEXT,
ADD COLUMN     "mutuelle2NumeroAdherent" TEXT,
ADD COLUMN     "mutuelle2NumeroContrat" TEXT,
ADD COLUMN     "mutuelle2Plateforme" TEXT,
ADD COLUMN     "mutuelle2RefuseeA" TIMESTAMP(3),
ADD COLUMN     "mutuelle2RenseigneeA" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "Mutuelle" (
    "id" TEXT NOT NULL,
    "creeA" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modifieA" TIMESTAMP(3) NOT NULL,
    "nom" TEXT NOT NULL,
    "plateforme" TEXT,
    "identifiantAcces" TEXT,
    "motDePasseAcces" TEXT,
    "urlPortail" TEXT,
    "telephone" TEXT,
    "email" TEXT,
    "delaiRemboursementJoursConnu" INTEGER,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "remarques" TEXT,

    CONSTRAINT "Mutuelle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CaisseAmo" (
    "id" TEXT NOT NULL,
    "creeA" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modifieA" TIMESTAMP(3) NOT NULL,
    "nom" TEXT NOT NULL,
    "codeCaisse" TEXT,
    "telephone" TEXT,
    "email" TEXT,
    "adresse" TEXT,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "remarques" TEXT,

    CONSTRAINT "CaisseAmo_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Mutuelle_nom_key" ON "Mutuelle"("nom");

-- CreateIndex
CREATE INDEX "Mutuelle_nom_idx" ON "Mutuelle"("nom");

-- CreateIndex
CREATE UNIQUE INDEX "CaisseAmo_nom_key" ON "CaisseAmo"("nom");

-- CreateIndex
CREATE INDEX "CaisseAmo_nom_idx" ON "CaisseAmo"("nom");

-- CreateIndex
CREATE UNIQUE INDEX "DemandePriseEnCharge_codePaiement_key" ON "DemandePriseEnCharge"("codePaiement");

