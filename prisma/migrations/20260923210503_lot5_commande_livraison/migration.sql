-- CreateEnum
CREATE TYPE "StatutCommande" AS ENUM ('A_PASSER', 'PASSEE', 'CONFIRMEE', 'RECUE', 'CONTROLEE');

-- CreateEnum
CREATE TYPE "StatutLivraison" AS ENUM ('PROGRAMMEE', 'REMISE', 'AJUSTEMENT_DEMANDE', 'CLOTUREE');

-- CreateTable
CREATE TABLE "Commande" (
    "id" TEXT NOT NULL,
    "creeA" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modifieA" TIMESTAMP(3) NOT NULL,
    "propositionId" TEXT NOT NULL,
    "personneId" TEXT NOT NULL,
    "statut" "StatutCommande" NOT NULL DEFAULT 'A_PASSER',
    "passeeA" TIMESTAMP(3),
    "confirmeeA" TIMESTAMP(3),
    "recueA" TIMESTAMP(3),
    "controleeA" TIMESTAMP(3),
    "delaiJoursEstime" INTEGER,

    CONSTRAINT "Commande_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommandeLigne" (
    "id" TEXT NOT NULL,
    "commandeId" TEXT NOT NULL,
    "produitId" TEXT NOT NULL,
    "libelleProduit" TEXT NOT NULL,
    "quantite" INTEGER NOT NULL DEFAULT 1,
    "numeroSerie" TEXT,

    CONSTRAINT "CommandeLigne_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Livraison" (
    "id" TEXT NOT NULL,
    "creeA" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modifieA" TIMESTAMP(3) NOT NULL,
    "commandeId" TEXT NOT NULL,
    "personneId" TEXT NOT NULL,
    "statut" "StatutLivraison" NOT NULL DEFAULT 'PROGRAMMEE',
    "dateProgrammee" TIMESTAMP(3),
    "remiseA" TIMESTAMP(3),
    "ajustementDemande" TEXT,
    "ajustementDemandeA" TIMESTAMP(3),
    "clotureeA" TIMESTAMP(3),

    CONSTRAINT "Livraison_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Commande_propositionId_idx" ON "Commande"("propositionId");

-- CreateIndex
CREATE INDEX "Commande_personneId_idx" ON "Commande"("personneId");

-- CreateIndex
CREATE INDEX "Commande_statut_idx" ON "Commande"("statut");

-- CreateIndex
CREATE INDEX "CommandeLigne_commandeId_idx" ON "CommandeLigne"("commandeId");

-- CreateIndex
CREATE UNIQUE INDEX "Livraison_commandeId_key" ON "Livraison"("commandeId");

-- CreateIndex
CREATE INDEX "Livraison_commandeId_idx" ON "Livraison"("commandeId");

-- CreateIndex
CREATE INDEX "Livraison_personneId_idx" ON "Livraison"("personneId");

-- CreateIndex
CREATE INDEX "Livraison_statut_idx" ON "Livraison"("statut");

-- AddForeignKey
ALTER TABLE "Commande" ADD CONSTRAINT "Commande_propositionId_fkey" FOREIGN KEY ("propositionId") REFERENCES "Proposition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommandeLigne" ADD CONSTRAINT "CommandeLigne_commandeId_fkey" FOREIGN KEY ("commandeId") REFERENCES "Commande"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommandeLigne" ADD CONSTRAINT "CommandeLigne_produitId_fkey" FOREIGN KEY ("produitId") REFERENCES "Produit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Livraison" ADD CONSTRAINT "Livraison_commandeId_fkey" FOREIGN KEY ("commandeId") REFERENCES "Commande"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
