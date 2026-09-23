-- CreateEnum
CREATE TYPE "RoleAssure" AS ENUM ('NON_RENSEIGNE', 'ASSURE', 'AYANT_DROIT');

-- CreateEnum
CREATE TYPE "TypeOrdonnance" AS ENUM ('OPTIQUE', 'AUDITION');

-- CreateEnum
CREATE TYPE "TypeDocument" AS ENUM ('CARTE_VITALE', 'CARTE_MUTUELLE', 'ORDONNANCE', 'JUSTIFICATIF', 'DEVIS_SIGNE', 'AUTRE');

-- CreateTable
CREATE TABLE "Evenement" (
    "id" TEXT NOT NULL,
    "survenuA" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "type" TEXT NOT NULL,
    "entite" TEXT NOT NULL,
    "entiteId" TEXT NOT NULL,
    "acteur" TEXT,
    "canal" TEXT NOT NULL DEFAULT 'comptoir',
    "donnees" JSONB,
    "personneId" TEXT,

    CONSTRAINT "Evenement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Foyer" (
    "id" TEXT NOT NULL,
    "creeA" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "nom" TEXT,

    CONSTRAINT "Foyer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Personne" (
    "id" TEXT NOT NULL,
    "creeA" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modifieA" TIMESTAMP(3) NOT NULL,
    "civilite" TEXT,
    "prenom" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "dateNaissance" TIMESTAMP(3),
    "telephone" TEXT,
    "email" TEXT,
    "adresse" TEXT,
    "codePostal" TEXT,
    "ville" TEXT,
    "foyerId" TEXT,
    "roleAssure" "RoleAssure" NOT NULL DEFAULT 'NON_RENSEIGNE',
    "contactPrefereSms" BOOLEAN NOT NULL DEFAULT false,
    "contactPrefereEmail" BOOLEAN NOT NULL DEFAULT false,
    "consentementEmail" BOOLEAN NOT NULL DEFAULT false,
    "consentementEmailA" TIMESTAMP(3),
    "consentementSms" BOOLEAN NOT NULL DEFAULT false,
    "consentementSmsA" TIMESTAMP(3),
    "syntheseBesoin" TEXT,
    "syntheseBesoinValideeA" TIMESTAMP(3),
    "syntheseBesoinValideePar" TEXT,

    CONSTRAINT "Personne_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Ordonnance" (
    "id" TEXT NOT NULL,
    "creeA" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "personneId" TEXT NOT NULL,
    "type" "TypeOrdonnance" NOT NULL,
    "dateEmission" TIMESTAMP(3) NOT NULL,
    "dateExpiration" TIMESTAMP(3),
    "emisePar" TEXT,
    "documentId" TEXT,

    CONSTRAINT "Ordonnance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Document" (
    "id" TEXT NOT NULL,
    "creeA" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "personneId" TEXT NOT NULL,
    "type" "TypeDocument" NOT NULL,
    "nomFichier" TEXT NOT NULL,
    "cheminStockage" TEXT NOT NULL,

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Evenement_entite_entiteId_idx" ON "Evenement"("entite", "entiteId");

-- CreateIndex
CREATE INDEX "Evenement_personneId_idx" ON "Evenement"("personneId");

-- CreateIndex
CREATE INDEX "Evenement_survenuA_idx" ON "Evenement"("survenuA");

-- CreateIndex
CREATE INDEX "Personne_nom_prenom_idx" ON "Personne"("nom", "prenom");

-- CreateIndex
CREATE INDEX "Personne_foyerId_idx" ON "Personne"("foyerId");

-- CreateIndex
CREATE UNIQUE INDEX "Ordonnance_documentId_key" ON "Ordonnance"("documentId");

-- CreateIndex
CREATE INDEX "Ordonnance_personneId_idx" ON "Ordonnance"("personneId");

-- CreateIndex
CREATE INDEX "Document_personneId_idx" ON "Document"("personneId");

-- AddForeignKey
ALTER TABLE "Evenement" ADD CONSTRAINT "Evenement_personneId_fkey" FOREIGN KEY ("personneId") REFERENCES "Personne"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Personne" ADD CONSTRAINT "Personne_foyerId_fkey" FOREIGN KEY ("foyerId") REFERENCES "Foyer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ordonnance" ADD CONSTRAINT "Ordonnance_personneId_fkey" FOREIGN KEY ("personneId") REFERENCES "Personne"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ordonnance" ADD CONSTRAINT "Ordonnance_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_personneId_fkey" FOREIGN KEY ("personneId") REFERENCES "Personne"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
