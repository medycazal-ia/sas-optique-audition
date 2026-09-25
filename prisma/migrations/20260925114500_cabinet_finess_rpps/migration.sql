-- AlterTable
ALTER TABLE "Ordonnance" ADD COLUMN     "cabinetNom" TEXT,
ADD COLUMN     "finess" TEXT,
ADD COLUMN     "rpps" TEXT;

-- CreateTable
CREATE TABLE "Cabinet" (
    "id" TEXT NOT NULL,
    "creeA" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "misAJourA" TIMESTAMP(3) NOT NULL,
    "nom" TEXT NOT NULL,
    "finess" TEXT NOT NULL,

    CONSTRAINT "Cabinet_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Cabinet_finess_key" ON "Cabinet"("finess");

-- CreateIndex
CREATE INDEX "Cabinet_nom_idx" ON "Cabinet"("nom");

