import type { Metadata, Viewport } from "next";
import "./globals.css";
import { UnitsProvider } from "@/components/UnitsProvider";
import { AuthProvider } from "@/components/AuthProvider";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";

export const metadata: Metadata = {
  title: {
    default: "MorphMatch — find your pro athlete body double",
    template: "%s · MorphMatch",
  },
  description:
    "Enter your height, weight and wingspan and find which professional footballers, basketballers, tennis players and swimmers are built like you.",
};

export const viewport: Viewport = {
  themeColor: "#f4f6f2",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* App Router loads this once in the root layout — the pages/_document rule does not apply. */}
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500..800&family=Instrument+Sans:wght@400;500;600;700&family=Spline+Sans+Mono:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="flex min-h-screen flex-col">
        <UnitsProvider>
          <AuthProvider>
            <Nav />
            <main className="flex-1">{children}</main>
            <Footer />
          </AuthProvider>
        </UnitsProvider>
      </body>
    </html>
  );
}
