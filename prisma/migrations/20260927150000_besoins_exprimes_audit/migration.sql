-- AlterTable
ALTER TABLE "Personne" ADD COLUMN     "transcriptionBesoin" TEXT,
ADD COLUMN     "visionBesoin" TEXT,
ADD COLUMN     "traitementsVerreBesoin" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "matiereMontureBesoin" TEXT,
ADD COLUMN     "styleBesoin" TEXT[] DEFAULT ARRAY[]::TEXT[];
