import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const viewport: Viewport = {
  width: 1294,
  initialScale: 1,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: "The Arts & Aging Network",
  description: "Administrative interface for The Arts & Aging Network",
  icons: {
    icon: '/favicon-192.png',
    apple: '/apple-touch-icon.png',
  },
  openGraph: {
    title: "The Arts & Aging Network",
    description: "Administrative interface for The Arts & Aging Network",
    images: ['/og-image.png'],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" style={{ minWidth: '1294px' }}>
      <body 
        className={`${inter.variable} font-sans min-h-screen bg-background text-gray-900`}
        suppressHydrationWarning={true}
      >
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
