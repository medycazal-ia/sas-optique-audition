-- AlterEnum
ALTER TYPE "RoleUtilisateur" ADD VALUE 'SUPER_ADMIN';

-- AlterTable
ALTER TABLE "Utilisateur" ADD COLUMN     "banni" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "banniA" TIMESTAMP(3),
ADD COLUMN     "banniMotif" TEXT,
ADD COLUMN     "banniPar" TEXT,
ADD COLUMN     "prenom" TEXT,
ADD COLUMN     "pseudo" TEXT,
ADD COLUMN     "telephonePerso" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Utilisateur_pseudo_key" ON "Utilisateur"("pseudo");

-- CreateIndex
CREATE INDEX "Utilisateur_role_idx" ON "Utilisateur"("role");

