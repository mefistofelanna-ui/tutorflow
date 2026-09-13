import type { Metadata, Viewport } from "next";
import { Manrope, Cormorant_Garamond } from "next/font/google";
import "./globals.css";
import AppProvider from "./AppProvider";
import PwaRegistration from "./PwaRegistration";

const manrope = Manrope({ variable: "--font-manrope", subsets: ["cyrillic", "latin"] });
const cormorant = Cormorant_Garamond({ variable: "--font-cormorant", subsets: ["cyrillic", "latin"], weight: ["500", "600", "700"] });

export const metadata: Metadata = {
  title: "TutorFlow — кабинет репетитора",
  description: "Расписание, ученики и оплаты частного преподавателя в одном уютном пространстве.",
  applicationName: "TutorFlow",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "TutorFlow", statusBarStyle: "default" },
  other: { "apple-mobile-web-app-capable": "yes" },
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg", apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }] },
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#ded0eb" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ru"><body className={`${manrope.variable} ${cormorant.variable}`}><PwaRegistration/><AppProvider>{children}</AppProvider></body></html>;
}
