import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Shell } from "@/components/Shell";
import { SocialProvider } from "@/components/SocialContext";
import { EARLY_PREFS_SCRIPT } from "@/lib/prefs";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Cultura Conecta",
  description:
    "Rede social cultural: vitrine profissional para artistas, produtoras, estúdios e marcas. Divulgue, encontre oportunidades e feche parcerias.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#060d1f",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="pt-BR"
      data-theme="dark"
      data-glass="1"
      data-has-bg="0"
      className={`${geistSans.variable} ${geistMono.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: EARLY_PREFS_SCRIPT }} />
      </head>
      <body className="bg-ink font-sans text-paper antialiased">
        <SocialProvider>
          <Shell>{children}</Shell>
        </SocialProvider>
      </body>
    </html>
  );
}
