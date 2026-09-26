-- CreateTable
CREATE TABLE "CodeSignatureSms" (
    "id" TEXT NOT NULL,
    "creeA" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "personneId" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "expireA" TIMESTAMP(3) NOT NULL,
    "utiliseA" TIMESTAMP(3),
    "tentatives" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "CodeSignatureSms_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CodeSignatureSms_personneId_idx" ON "CodeSignatureSms"("personneId");

-- AddForeignKey
ALTER TABLE "CodeSignatureSms" ADD CONSTRAINT "CodeSignatureSms_personneId_fkey" FOREIGN KEY ("personneId") REFERENCES "Personne"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

