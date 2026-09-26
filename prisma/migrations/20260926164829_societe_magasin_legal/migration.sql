-- AlterTable
ALTER TABLE "Magasin" ADD COLUMN     "adresse" TEXT,
ADD COLUMN     "codePostal" TEXT,
ADD COLUMN     "email" TEXT,
ADD COLUMN     "finess" TEXT,
ADD COLUMN     "numeroAgrementAudio" TEXT,
ADD COLUMN     "numeroAgrementOptique" TEXT,
ADD COLUMN     "responsable" TEXT,
ADD COLUMN     "siret" TEXT,
ADD COLUMN     "telephone" TEXT;

-- CreateTable
CREATE TABLE "Societe" (
    "id" TEXT NOT NULL,
    "creeA" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modifieA" TIMESTAMP(3) NOT NULL,
    "raisonSociale" TEXT,
    "formeJuridique" TEXT,
    "siret" TEXT,
    "numeroTvaIntracommunautaire" TEXT,
    "rcs" TEXT,
    "capitalSocial" TEXT,
    "codeApe" TEXT,
    "adresse" TEXT,
    "codePostal" TEXT,
    "ville" TEXT,
    "telephone" TEXT,
    "email" TEXT,
    "siteWeb" TEXT,
    "representantLegal" TEXT,
    "numeroFiness" TEXT,
    "assuranceRcProNom" TEXT,
    "assuranceRcProNumero" TEXT,
    "iban" TEXT,
    "bic" TEXT,

    CONSTRAINT "Societe_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Societe_siret_key" ON "Societe"("siret");

