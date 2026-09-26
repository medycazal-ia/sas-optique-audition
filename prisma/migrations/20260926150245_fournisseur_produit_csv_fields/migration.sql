-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "TypeProduit" ADD VALUE 'APPAREIL_AUDITIF';
ALTER TYPE "TypeProduit" ADD VALUE 'ECOUTEUR';
ALTER TYPE "TypeProduit" ADD VALUE 'PILE_AUDITIVE';
ALTER TYPE "TypeProduit" ADD VALUE 'ACCESSOIRE_AUDITIF';

-- AlterTable
ALTER TABLE "Produit" ADD COLUMN     "activite" "TypeOrdonnance" NOT NULL DEFAULT 'OPTIQUE',
ADD COLUMN     "categorie" TEXT,
ADD COLUMN     "coefficient" DOUBLE PRECISION,
ADD COLUMN     "coloris" TEXT,
ADD COLUMN     "dateDerniereSortie" TIMESTAMP(3),
ADD COLUMN     "fournisseurId" TEXT,
ADD COLUMN     "nomenclature" TEXT,
ADD COLUMN     "plafondRemise" DOUBLE PRECISION,
ADD COLUMN     "prixAchat" INTEGER,
ADD COLUMN     "prixVenteHT" INTEGER,
ADD COLUMN     "qrcode" TEXT,
ADD COLUMN     "remarque" TEXT,
ADD COLUMN     "taille" TEXT,
ADD COLUMN     "tauxTva" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "PropositionLigne" ADD COLUMN     "descriptionProduit" TEXT,
ADD COLUMN     "fournisseurNom" TEXT,
ADD COLUMN     "marqueProduit" TEXT;

-- CreateTable
CREATE TABLE "Fournisseur" (
    "id" TEXT NOT NULL,
    "creeA" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modifieA" TIMESTAMP(3) NOT NULL,
    "nom" TEXT NOT NULL,
    "contact" TEXT,
    "sav" TEXT,
    "conditionsCommerciales" TEXT,
    "remarques" TEXT,

    CONSTRAINT "Fournisseur_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Fournisseur_nom_key" ON "Fournisseur"("nom");

-- CreateIndex
CREATE INDEX "Fournisseur_nom_idx" ON "Fournisseur"("nom");

-- CreateIndex
CREATE UNIQUE INDEX "Produit_qrcode_key" ON "Produit"("qrcode");

-- CreateIndex
CREATE INDEX "Produit_activite_idx" ON "Produit"("activite");

-- CreateIndex
CREATE INDEX "Produit_fournisseurId_idx" ON "Produit"("fournisseurId");

-- AddForeignKey
ALTER TABLE "Produit" ADD CONSTRAINT "Produit_fournisseurId_fkey" FOREIGN KEY ("fournisseurId") REFERENCES "Fournisseur"("id") ON DELETE SET NULL ON UPDATE CASCADE;

