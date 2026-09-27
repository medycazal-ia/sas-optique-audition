-- CreateTable
CREATE TABLE "ConfigurationRdv" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "googleRefreshToken" TEXT,
    "googleEmailCompte" TEXT,
    "googleCalendarId" TEXT NOT NULL DEFAULT 'primary',
    "dureeCreneauMinutes" INTEGER NOT NULL DEFAULT 30,
    "heureDebut" TEXT NOT NULL DEFAULT '09:00',
    "heureFin" TEXT NOT NULL DEFAULT '18:00',
    "joursOuvres" INTEGER[] DEFAULT ARRAY[1, 2, 3, 4, 5]::INTEGER[],
    "connecteA" TIMESTAMP(3),
    "connectePar" TEXT,
    "creeA" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "majA" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConfigurationRdv_pkey" PRIMARY KEY ("id")
);
