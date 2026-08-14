import type { Metadata } from "next";
import { Manrope, Cormorant_Garamond } from "next/font/google";
import "./globals.css";
import AppProvider from "./AppProvider";

const manrope = Manrope({ variable: "--font-manrope", subsets: ["cyrillic", "latin"] });
const cormorant = Cormorant_Garamond({ variable: "--font-cormorant", subsets: ["cyrillic", "latin"], weight: ["500", "600", "700"] });

export const metadata: Metadata = {
  title: "TutorFlow — кабинет репетитора",
  description: "Расписание, ученики и оплаты частного преподавателя в одном уютном пространстве.",
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ru"><body className={`${manrope.variable} ${cormorant.variable}`}><AppProvider>{children}</AppProvider></body></html>;
}
