import type { Metadata } from "next";
import { Anek_Malayalam, Noto_Sans_Malayalam } from "next/font/google";
import "./globals.css";

const anek = Anek_Malayalam({ subsets: ["malayalam", "latin"], variable: "--font-anek", display: "swap" });
// Titles: Anek Malayalam. Content: Noto Sans Malayalam.
const noto = Noto_Sans_Malayalam({ subsets: ["malayalam", "latin"], weight: ["400", "500", "600", "700"], variable: "--font-noto", display: "swap" });

const site = process.env.NEXT_PUBLIC_SITE_URL || "https://theecho.in";

export const metadata: Metadata = {
  metadataBase: new URL(site),
  title: { default: "The Echo — Malayalam News, Kerala Latest Updates", template: "%s | The Echo" },
  description: "Echoing the unheard voices. Malayalam news from Kerala, India and the world.",
  openGraph: { siteName: "The Echo", type: "website", locale: "ml_IN" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ml" className={`${anek.variable} ${noto.variable}`} suppressHydrationWarning>
      <head>
        {/* apply saved theme before first paint to avoid a flash */}
        <script dangerouslySetInnerHTML={{ __html: `try{var t=localStorage.getItem("theme");if(t)document.documentElement.dataset.theme=t}catch(e){}` }} />
      </head>
      <body className="min-h-screen flex flex-col">
        {children}
      </body>
    </html>
  );
}
