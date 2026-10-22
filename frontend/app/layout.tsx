import type { Metadata, Viewport } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";
import { AuthSync } from "@/components/AuthSync";
import { AppInteractionGuards } from "@/components/AppInteractionGuards";
import { AppPreferences } from "@/components/AppPreferences";
import { AppServiceWorkerUpdater } from "@/components/AppServiceWorkerUpdater";
import { AppStatusNotifier } from "@/components/AppStatusNotifier";
import { PwaInstallBanner } from "@/components/PwaInstallBanner";
import { YelooSplash } from "@/components/YelooSplash";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-yeloo",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Yeloo+ - Logements en Côte d'Ivoire",
  description:
    "Trouvez un logement en Côte d'Ivoire, directement auprès des propriétaires, sans arnaques.",
  manifest: "/manifest.webmanifest",
  applicationName: "Yeloo+",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Yeloo+",
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
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#1d4ed8",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="fr"
      className={poppins.variable}
      // Set the variable inline too: the hashed class from next/font can differ between the
      // server and client builds in dev, which silently dropped Poppins for the system font.
      style={{ ["--font-yeloo" as string]: poppins.style.fontFamily }}
      suppressHydrationWarning
    >
      <body className="min-h-screen bg-white text-neutral-900">
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                var raw = window.localStorage.getItem("yeloo-preferences");
                var parsed = raw ? JSON.parse(raw) : null;
                var state = parsed && parsed.state ? parsed.state : parsed;
                var theme = state && state.theme ? state.theme : "light";
                var language = state && state.language ? state.language : "fr";
                document.documentElement.dataset.theme = theme;
                document.documentElement.classList.toggle("dark", theme === "dark");
                document.documentElement.lang = language;
              } catch (_) {}
            `,
          }}
        />
        <AppPreferences />
        <AppServiceWorkerUpdater />
        <AuthSync />
        <AppInteractionGuards />
        <AppStatusNotifier />
        <YelooSplash />
        <PwaInstallBanner />
        {children}
      </body>
    </html>
  );
}
