import type { Metadata, Viewport } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";
import { AuthSync } from "@/components/AuthSync";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-yeloo",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Yeloo - Logements en Cote d'Ivoire",
  description:
    "Trouvez un logement en Cote d'Ivoire, directement aupres des proprietaires, sans arnaques.",
  manifest: "/manifest.webmanifest",
  applicationName: "Yeloo",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Yeloo",
  },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#ffffff",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr" className={poppins.variable}>
      <body className="min-h-screen bg-white text-neutral-900">
        <AuthSync />
        {children}
      </body>
    </html>
  );
}
