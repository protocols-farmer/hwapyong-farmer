//src/app/layout.tsx
import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import "./globals.css";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import StoreProvider from "@/components/providers/StoreProvider";
import MaintenanceGuard from "@/components/shared/MaintenanceGuard";
import AuthInitializer from "@/components/providers/AuthInitializer";
import { FlourishSprites } from "@/components/shared/FlourishSprites";
import localFont from "next/font/local";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const ghosthey = localFont({
  src: "./fonts/ghosthey-Regular.ttf",
  variable: "--font-ghosthey",
  display: "swap",
});

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL || "https://hwapyong.vercel.app";
const siteDescription =
  "Personal engineering laboratory, systems notes, bio-engineering explorations, and project logs.";
const siteImage =
  "https://res.cloudinary.com/dhr9zmb3i/image/upload/v1788260763/hwapyong/profile/r7kdrx8gcmwyvnbumrqt.png";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Rotten Lab",
    template: "%s | Rotten Lab",
  },
  description: siteDescription,
  applicationName: "Rotten Lab",
  openGraph: {
    type: "website",
    siteName: "Rotten Lab",
    title: "Rotten Lab",
    description: siteDescription,
    url: "/",
    images: [{ url: siteImage, alt: "Rotten Lab" }],
  },
  twitter: {
    card: "summary",
    title: "Rotten Lab",
    description: siteDescription,
    images: [siteImage],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  themeColor: "#1a0b02",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${ghosthey.variable} antialiased`}
      >
        <StoreProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="dark"
            enableSystem
            disableTransitionOnChange
          >
            <AuthInitializer>
              <MaintenanceGuard>
                <FlourishSprites />
                {children}
              </MaintenanceGuard>
            </AuthInitializer>
          </ThemeProvider>
        </StoreProvider>
      </body>
    </html>
  );
}
