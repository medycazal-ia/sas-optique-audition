-- AlterTable
ALTER TABLE "Personne" ADD COLUMN     "mutuelleExtraitParOcrA" TIMESTAMP(3),
ADD COLUMN     "mutuelleNumeroContrat" TEXT,
ADD COLUMN     "mutuellePlateforme" TEXT;

-- CreateTable
CREATE TABLE "PlateformeTiersPayant" (
    "id" TEXT NOT NULL,
    "creeA" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "misAJourA" TIMESTAMP(3) NOT NULL,
    "nom" TEXT NOT NULL,
    "emailPro" TEXT,
    "telephonePro" TEXT,

    CONSTRAINT "PlateformeTiersPayant_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PlateformeTiersPayant_nom_key" ON "PlateformeTiersPayant"("nom");

-- CreateIndex
CREATE INDEX "PlateformeTiersPayant_nom_idx" ON "PlateformeTiersPayant"("nom");

-- Seed des plateformes de tiers payant majeures du marché optique français
-- (noms vérifiés par recherche web, voir PR) — aucun contact pro fourni
-- (jamais inventé), à compléter à la main dans la carte Mutuelle.
INSERT INTO "PlateformeTiersPayant" ("id", "nom", "misAJourA")
VALUES
  (gen_random_uuid()::text, 'Viamédis', CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'Almerys', CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'iSanté', CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'SP Santé', CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'Carte Blanche', CURRENT_TIMESTAMP)
ON CONFLICT ("nom") DO NOTHING;

