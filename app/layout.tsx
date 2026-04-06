import type { Metadata, Viewport } from "next";
import "./globals.css";
import { PlayerProvider } from "@/lib/player-context";
import PersistentPlayer from "@/components/PersistentPlayer";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: "THESANDALVAULT",
  description: "ideas, drafts, and loops",
  robots: "noindex, nofollow",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-bg-0 text-accent min-h-screen">
        <PlayerProvider>
          {children}
          <PersistentPlayer />
        </PlayerProvider>
      </body>
    </html>
  );
}
