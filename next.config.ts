import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  async redirects() {
    return [
      // Bouton "Je découvre FACILOG" (page d'accueil) — URL courte et stable
      // du site plutôt que le lien Google Forms brut, pour pouvoir le
      // changer un jour sans casser les supports déjà imprimés/partagés.
      {
        source: "/formulaire",
        destination: "https://forms.gle/ZEpxuyRzaqwy9xUK7",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
