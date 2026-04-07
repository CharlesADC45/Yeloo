import type { Metadata } from "next";
import "./globals.css";
import { AuthSync } from "@/components/AuthSync";

export const metadata: Metadata = {
  title: "Yeloo - Logements en Cote d'Ivoire",
  description:
    "Trouvez un logement en Cote d'Ivoire, directement aupres des proprietaires, sans arnaques.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <body className="min-h-screen bg-white text-neutral-900">
        <AuthSync />
        {children}
      </body>
    </html>
  );
}

