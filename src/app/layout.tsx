import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { UserProvider } from "@/lib/userContext";
import NavWrapper from "@/components/NavWrapper";

const inter = Inter({ 
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "ImmiCalm — Immigration Peace of Mind",
  description: "Privacy-first, verified immigration updates for F1/H1B visa holders. Cut through clickbait, see only what matters to you.",
  keywords: "immigration, F1 visa, H1B visa, immigration news, USCIS updates, OPT, STEM OPT, immigration anxiety",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark" data-scroll-behavior="smooth">
      <body className={`${inter.className} min-h-screen relative`}>
        <UserProvider>
          <NavWrapper />
          <main className="relative z-10">
            {children}
          </main>
        </UserProvider>
      </body>
    </html>
  );
}