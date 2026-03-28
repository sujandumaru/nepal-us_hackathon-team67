import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { UserProvider } from "@/lib/userContext";

const geist = Geist({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "ImmiCalm — Immigration Peace of Mind",
  description: "Verified immigration updates for Nepali immigrants in the US",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${geist.className} bg-gray-950 text-white min-h-screen`}>
        <UserProvider>{children}</UserProvider>
      </body>
    </html>
  );
}