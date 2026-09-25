-- CreateEnum
CREATE TYPE "TypeProduit" AS ENUM ('MONTURE', 'VERRE', 'LENTILLE', 'ACCESSOIRE');

-- CreateEnum
CREATE TYPE "StatutProduit" AS ENUM ('ACTIF', 'RUPTURE', 'DISCONTINUE');

-- CreateTable
CREATE TABLE "Magasin" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "ville" TEXT,

    CONSTRAINT "Magasin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Produit" (
    "id" TEXT NOT NULL,
    "creeA" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modifieA" TIMESTAMP(3) NOT NULL,
    "type" "TypeProduit" NOT NULL,
    "reference" TEXT NOT NULL,
    "marque" TEXT NOT NULL,
    "modele" TEXT NOT NULL,
    "description" TEXT,
    "prixTTC" INTEGER NOT NULL,
    "statut" "StatutProduit" NOT NULL DEFAULT 'ACTIF',

    CONSTRAINT "Produit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Stock" (
    "id" TEXT NOT NULL,
    "modifieA" TIMESTAMP(3) NOT NULL,
    "produitId" TEXT NOT NULL,
    "magasinId" TEXT NOT NULL,
    "quantite" INTEGER NOT NULL DEFAULT 0,
    "quantiteReservee" INTEGER NOT NULL DEFAULT 0,
    "delaiJoursReappro" INTEGER,

    CONSTRAINT "Stock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HistoriquePrix" (
    "id" TEXT NOT NULL,
    "effectifA" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "produitId" TEXT NOT NULL,
    "prixTTC" INTEGER NOT NULL,
    "modifiePar" TEXT,

    CONSTRAINT "HistoriquePrix_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Produit_reference_key" ON "Produit"("reference");

-- CreateIndex
CREATE INDEX "Produit_type_idx" ON "Produit"("type");

-- CreateIndex
CREATE INDEX "Produit_marque_idx" ON "Produit"("marque");

-- CreateIndex
CREATE INDEX "Stock_magasinId_idx" ON "Stock"("magasinId");

-- CreateIndex
CREATE UNIQUE INDEX "Stock_produitId_magasinId_key" ON "Stock"("produitId", "magasinId");

-- CreateIndex
CREATE INDEX "HistoriquePrix_produitId_idx" ON "HistoriquePrix"("produitId");

-- AddForeignKey
ALTER TABLE "Stock" ADD CONSTRAINT "Stock_produitId_fkey" FOREIGN KEY ("produitId") REFERENCES "Produit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Stock" ADD CONSTRAINT "Stock_magasinId_fkey" FOREIGN KEY ("magasinId") REFERENCES "Magasin"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HistoriquePrix" ADD CONSTRAINT "HistoriquePrix_produitId_fkey" FOREIGN KEY ("produitId") REFERENCES "Produit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
