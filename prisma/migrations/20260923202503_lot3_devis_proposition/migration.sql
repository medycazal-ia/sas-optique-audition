-- CreateEnum
CREATE TYPE "StatutProposition" AS ENUM ('BROUILLON', 'ENVOYEE', 'ACCEPTEE', 'REFUSEE', 'EXPIREE');

-- CreateTable
CREATE TABLE "Proposition" (
    "id" TEXT NOT NULL,
    "creeA" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modifieA" TIMESTAMP(3) NOT NULL,
    "personneId" TEXT NOT NULL,
    "statut" "StatutProposition" NOT NULL DEFAULT 'BROUILLON',
    "envoyeeA" TIMESTAMP(3),
    "decideeA" TIMESTAMP(3),
    "notes" TEXT,
    "cent100Sante" BOOLEAN NOT NULL DEFAULT false,
    "remplaceId" TEXT,

    CONSTRAINT "Proposition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PropositionLigne" (
    "id" TEXT NOT NULL,
    "creeA" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "propositionId" TEXT NOT NULL,
    "produitId" TEXT NOT NULL,
    "libelleProduit" TEXT NOT NULL,
    "quantite" INTEGER NOT NULL DEFAULT 1,
    "prixUnitaireTTC" INTEGER NOT NULL,

    CONSTRAINT "PropositionLigne_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Proposition_remplaceId_key" ON "Proposition"("remplaceId");

-- CreateIndex
CREATE INDEX "Proposition_personneId_idx" ON "Proposition"("personneId");

-- CreateIndex
CREATE INDEX "Proposition_statut_idx" ON "Proposition"("statut");

-- CreateIndex
CREATE INDEX "PropositionLigne_propositionId_idx" ON "PropositionLigne"("propositionId");

-- AddForeignKey
ALTER TABLE "Proposition" ADD CONSTRAINT "Proposition_personneId_fkey" FOREIGN KEY ("personneId") REFERENCES "Personne"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Proposition" ADD CONSTRAINT "Proposition_remplaceId_fkey" FOREIGN KEY ("remplaceId") REFERENCES "Proposition"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropositionLigne" ADD CONSTRAINT "PropositionLigne_propositionId_fkey" FOREIGN KEY ("propositionId") REFERENCES "Proposition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropositionLigne" ADD CONSTRAINT "PropositionLigne_produitId_fkey" FOREIGN KEY ("produitId") REFERENCES "Produit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
