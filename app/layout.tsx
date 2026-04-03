import type { Metadata } from "next";
import "./globals.css";
import { PlayerProvider } from "@/lib/player-context";
import PersistentPlayer from "@/components/PersistentPlayer";

export const metadata: Metadata = {
  title: "THESANDALVAULT",
  description: "ideas, drafts, and loops",
  robots: "noindex, nofollow",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
      </head>
      <body className="bg-bg-0 text-accent min-h-screen">
        <PlayerProvider>
          {children}
          <PersistentPlayer />
        </PlayerProvider>
      </body>
    </html>
  );
}
