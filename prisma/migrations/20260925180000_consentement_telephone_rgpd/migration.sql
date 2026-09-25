-- AlterEnum
ALTER TYPE "TypeDocument" ADD VALUE 'CONSENTEMENT_RGPD';

-- AlterTable
ALTER TABLE "Personne" ADD COLUMN     "consentementTelephone" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "consentementTelephoneA" TIMESTAMP(3),
ADD COLUMN     "rgpdInformeA" TIMESTAMP(3);

