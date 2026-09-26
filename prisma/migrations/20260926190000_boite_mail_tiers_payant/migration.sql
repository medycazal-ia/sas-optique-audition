-- CreateTable
CREATE TABLE "BoiteMailTiersPayant" (
    "id" TEXT NOT NULL,
    "creeA" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modifieA" TIMESTAMP(3) NOT NULL,
    "nom" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "plateformes" TEXT[],
    "makeScenarioId" INTEGER,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "derniereReceptionA" TIMESTAMP(3),
    "remarques" TEXT,

    CONSTRAINT "BoiteMailTiersPayant_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BoiteMailTiersPayant_email_key" ON "BoiteMailTiersPayant"("email");

-- CreateIndex
CREATE INDEX "BoiteMailTiersPayant_email_idx" ON "BoiteMailTiersPayant"("email");

