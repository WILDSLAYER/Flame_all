import type { Metadata } from "next";
import { AppProvider } from "@/components/AppContext";
import { Nav } from "@/components/Nav";
import "./globals.css";

export const metadata: Metadata = {
  title: "Flame_all",
  description: "Insultos creativos para tus partidas, votados por la comunidad.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>
        <AppProvider>
          <Nav />
          <main>{children}</main>
        </AppProvider>
      </body>
    </html>
  );
}
