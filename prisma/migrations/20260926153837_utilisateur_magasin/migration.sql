-- AlterTable
ALTER TABLE "Utilisateur" ADD COLUMN     "magasinId" TEXT;

-- CreateIndex
CREATE INDEX "Utilisateur_magasinId_idx" ON "Utilisateur"("magasinId");

-- AddForeignKey
ALTER TABLE "Utilisateur" ADD CONSTRAINT "Utilisateur_magasinId_fkey" FOREIGN KEY ("magasinId") REFERENCES "Magasin"("id") ON DELETE SET NULL ON UPDATE CASCADE;

