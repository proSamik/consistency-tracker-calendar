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
 * Includes global navigation bar
 */
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className} suppressHydrationWarning={true}>
        <Navigation />
        <main>{children}</main>
      </body>
    </html>
  );
}
