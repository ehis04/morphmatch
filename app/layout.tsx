import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Instrument_Sans, Spline_Sans_Mono } from "next/font/google";
import "./globals.css";
import { UnitsProvider } from "@/components/UnitsProvider";
import { AuthProvider } from "@/components/AuthProvider";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { getSiteUrl } from "@/lib/site";
import { ProfileProvider } from "@/lib/profile";

const display = Bricolage_Grotesque({ subsets: ["latin"], variable: "--font-bricolage" });
const sans = Instrument_Sans({ subsets: ["latin"], variable: "--font-instrument" });
const mono = Spline_Sans_Mono({ subsets: ["latin"], variable: "--font-spline" });

export const metadata: Metadata = {
  metadataBase: getSiteUrl(),
  title: {
    default: "MorphMatch — find your pro athlete body double",
    template: "%s · MorphMatch",
  },
  description:
    "Enter your height, weight and wingspan and find which professional footballers, basketballers, tennis players and swimmers are built like you.",
  openGraph: {
    title: "MorphMatch — find your pro athlete body double",
    description: "Compare your measurements with 350 athletes across four sports.",
    type: "website",
    siteName: "MorphMatch",
  },
  twitter: { card: "summary_large_image", images: ["/opengraph-image"] },
};

export const viewport: Viewport = {
  themeColor: "#f4f6f2",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${sans.variable} ${mono.variable}`}>
      <body className="flex min-h-screen flex-col">
        <a
          href="#main-content"
          className="sr-only z-50 rounded-md bg-tape p-3 font-bold focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
        >
          Skip to content
        </a>
        <UnitsProvider>
          <ProfileProvider>
            <AuthProvider>
              <Nav />
              <main id="main-content" tabIndex={-1} className="flex-1">
                {children}
              </main>
              <Footer />
            </AuthProvider>
          </ProfileProvider>
        </UnitsProvider>
      </body>
    </html>
  );
}
