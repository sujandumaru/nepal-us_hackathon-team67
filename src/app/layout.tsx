import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { UserProvider } from "@/lib/userContext";
import NavWrapper from "@/components/NavWrapper";

const geist = Geist({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "ImmiCalm — Immigration Peace of Mind",
  description: "Verified immigration updates for F1/H1B visa holders in the US",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${geist.className} bg-gray-50 text-gray-900 min-h-screen`}>
        <UserProvider>
          <NavWrapper />
          {children}
        </UserProvider>
      </body>
    </html>
  );
}