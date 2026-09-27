import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import AssistantVocal from "@/components/AssistantVocal";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "FACILOG — Optique & Audition",
  description: "Dossier client unique — Optique & Audition",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="fr"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col text-neutral-900">
        {/*
          Bandeau de marque présent sur toutes les pages (posé ici, dans le
          layout racine, plutôt que répété page par page) — discret,
          n'entre pas en concurrence avec le contenu de chaque écran.
        */}
        <header className="flex shrink-0 items-center border-b border-neutral-100 bg-white px-4 py-2 sm:px-6">
          <Link href="/" className="flex items-center gap-2">
            <Image src="/logo-facilog.svg" alt="" width={28} height={28} priority unoptimized />
            <span className="text-sm font-bold tracking-tight text-neutral-800">FACILOG</span>
          </Link>
        </header>
        {children}
        <AssistantVocal />
      </body>
    </html>
  );
}
