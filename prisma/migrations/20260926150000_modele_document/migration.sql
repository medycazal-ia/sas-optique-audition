-- CreateEnum
CREATE TYPE "TypeModeleDocument" AS ENUM ('FACTURE', 'DEVIS_NORMALISE', 'DEVIS_NON_NORMALISE', 'ACCORD_TIERS_PAYANT');

-- CreateTable
CREATE TABLE "ModeleDocument" (
    "id" TEXT NOT NULL,
    "creeA" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modifieA" TIMESTAMP(3) NOT NULL,
    "type" "TypeModeleDocument" NOT NULL,
    "nom" TEXT NOT NULL,
    "actif" BOOLEAN NOT NULL DEFAULT false,
    "enteteNom" TEXT,
    "enteteAdresse" TEXT,
    "enteteSiret" TEXT,
    "enteteTelephone" TEXT,
    "enteteEmail" TEXT,
    "texteIntro" TEXT,
    "piedDePage" TEXT,

    CONSTRAINT "ModeleDocument_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ModeleDocument_type_idx" ON "ModeleDocument"("type");

