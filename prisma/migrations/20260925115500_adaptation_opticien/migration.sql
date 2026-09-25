-- AlterTable
ALTER TABLE "Ordonnance" ADD COLUMN     "additionOdModifiee" DOUBLE PRECISION,
ADD COLUMN     "additionOgModifiee" DOUBLE PRECISION,
ADD COLUMN     "axeOdModifiee" INTEGER,
ADD COLUMN     "axeOgModifiee" INTEGER,
ADD COLUMN     "cylindreOdModifiee" DOUBLE PRECISION,
ADD COLUMN     "cylindreOgModifiee" DOUBLE PRECISION,
ADD COLUMN     "dateModification" TIMESTAMP(3),
ADD COLUMN     "modifieePar" TEXT,
ADD COLUMN     "sphereOdModifiee" DOUBLE PRECISION,
ADD COLUMN     "sphereOgModifiee" DOUBLE PRECISION;

