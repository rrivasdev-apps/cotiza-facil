import type { Metadata } from "next";
import { Manrope, Inter, JetBrains_Mono, Space_Grotesk } from "next/font/google";
import "./globals.css";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

// Fuente de títulos/headers del rediseño — separada de --font-ui
// (Manrope), ver --font-display en design-tokens.css.
const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

const SITE_DESCRIPTION = "Crea presupuestos con la imagen de tu empresa y envíalos en minutos.";

// La imagen OG sale de src/app/opengraph-image.png (convención de Next).
// Sin ella WhatsApp cae al favicon cuadrado y lo muestra gigante.
export const metadata: Metadata = {
  title: "Cotiza Fácil",
  description: SITE_DESCRIPTION,
  openGraph: {
    title: "Cotiza Fácil",
    description: SITE_DESCRIPTION,
    siteName: "Cotiza Fácil",
    locale: "es_ES",
    type: "website",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      className={`${manrope.variable} ${inter.variable} ${jetbrainsMono.variable} ${spaceGrotesk.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}
