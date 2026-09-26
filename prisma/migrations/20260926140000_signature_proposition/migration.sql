-- CreateEnum
CREATE TYPE "ModeSignature" AS ENUM ('ECRAN', 'PAD', 'SMS', 'PAPIER');

-- AlterTable
ALTER TABLE "Document" ADD COLUMN     "propositionId" TEXT;

-- AlterTable
ALTER TABLE "Proposition" ADD COLUMN     "signatureMode" "ModeSignature";

-- CreateIndex
CREATE INDEX "Document_propositionId_idx" ON "Document"("propositionId");

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_propositionId_fkey" FOREIGN KEY ("propositionId") REFERENCES "Proposition"("id") ON DELETE SET NULL ON UPDATE CASCADE;

