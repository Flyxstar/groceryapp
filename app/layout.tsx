import type { Metadata } from "next";
import "./globals.css";
import { AppStateProvider } from "@/lib/app-state";
import Nav from "@/components/Nav";

export const metadata: Metadata = {
  title: "Veckans Klipp – cirkla dina erbjudanden",
  description:
    "Bläddra i veckans reklamblad från Lidl, ICA, City Gross, Willys, Hemköp och Coop. Ringa in varor som i en leksakskatalog, jämför priser och planera den smartaste handlingsrundan.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="sv">
      <body>
        <AppStateProvider>
          <Nav />
          <main className="mx-auto max-w-5xl px-4 pb-24 pt-6">{children}</main>
        </AppStateProvider>
      </body>
    </html>
  );
}
