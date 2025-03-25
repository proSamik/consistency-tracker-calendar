import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Navigation from "@/components/Navigation";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Consistency Tracker",
  description: "Track your consistency across different platforms",
};

/**
 * Root layout component that wraps all pages
 * Includes global navigation bar and ensures full viewport coverage
 */
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full bg-white">
      <body 
        className={`${inter.className} min-h-screen w-full overflow-x-hidden bg-gradient-to-b from-indigo-50 to-white`} 
        suppressHydrationWarning={true}
      >
        <Navigation />
        <main className="min-h-[calc(100vh-64px)]">{children}</main>
      </body>
    </html>
  );
}
