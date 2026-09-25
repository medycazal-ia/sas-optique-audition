-- CreateEnum
CREATE TYPE "StatutFacture" AS ENUM ('EMISE', 'PAYEE_PARTIELLEMENT', 'SOLDEE');

-- CreateTable
CREATE TABLE "Facture" (
    "id" TEXT NOT NULL,
    "creeA" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modifieA" TIMESTAMP(3) NOT NULL,
    "livraisonId" TEXT NOT NULL,
    "personneId" TEXT NOT NULL,
    "statut" "StatutFacture" NOT NULL DEFAULT 'EMISE',
    "montantTTC" INTEGER NOT NULL,
    "delaiPaiementJours" INTEGER NOT NULL DEFAULT 30,
    "notes" TEXT,

    CONSTRAINT "Facture_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Paiement" (
    "id" TEXT NOT NULL,
    "creeA" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "factureId" TEXT NOT NULL,
    "montantTTC" INTEGER NOT NULL,
    "moyen" TEXT,

    CONSTRAINT "Paiement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Avoir" (
    "id" TEXT NOT NULL,
    "creeA" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "factureId" TEXT NOT NULL,
    "montantTTC" INTEGER NOT NULL,
    "motif" TEXT,

    CONSTRAINT "Avoir_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Facture_livraisonId_key" ON "Facture"("livraisonId");

-- CreateIndex
CREATE INDEX "Facture_livraisonId_idx" ON "Facture"("livraisonId");

-- CreateIndex
CREATE INDEX "Facture_personneId_idx" ON "Facture"("personneId");

-- CreateIndex
CREATE INDEX "Facture_statut_idx" ON "Facture"("statut");

-- CreateIndex
CREATE INDEX "Paiement_factureId_idx" ON "Paiement"("factureId");

-- CreateIndex
CREATE INDEX "Avoir_factureId_idx" ON "Avoir"("factureId");

-- AddForeignKey
ALTER TABLE "Facture" ADD CONSTRAINT "Facture_livraisonId_fkey" FOREIGN KEY ("livraisonId") REFERENCES "Livraison"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Paiement" ADD CONSTRAINT "Paiement_factureId_fkey" FOREIGN KEY ("factureId") REFERENCES "Facture"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Avoir" ADD CONSTRAINT "Avoir_factureId_fkey" FOREIGN KEY ("factureId") REFERENCES "Facture"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
