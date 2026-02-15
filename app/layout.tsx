import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "Arts & Aging Admin Panel",
  description: "Administrative interface for Arts & Aging Network",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body 
        className={`${inter.variable} font-sans min-h-screen bg-background text-gray-900`}
        suppressHydrationWarning={true}
      >
        {children}
      </body>
    </html>
  );
}
