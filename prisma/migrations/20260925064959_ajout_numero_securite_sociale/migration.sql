-- AlterTable
ALTER TABLE "Personne" ADD COLUMN     "numeroSecuriteSociale" TEXT;

-- CreateIndex
CREATE INDEX "Personne_numeroSecuriteSociale_idx" ON "Personne"("numeroSecuriteSociale");
