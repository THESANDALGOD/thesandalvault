"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getPublicTracks, getSpotlightTracks, getSignedUrl, getSettings, getLogoUrl, type Track, type SiteSettings } from "@/lib/supabase";
import { usePlayer } from "@/lib/player-context";
import VaultOrb from "@/components/VaultOrb";

function fmt(s: number | null): string {
  if (!s || s <= 0) return "0:00";
  return `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, "0")}`;
}

function EqBars({ active }: { active: boolean }) {
  return (
    <div className="flex items-end gap-[2px] h-3 w-3">
      {[0, 1, 2].map((i) => (
        <div key={i} className={`w-[3px] rounded-sm transition-all duration-300 ${active ? "bg-white now-playing-pulse" : "bg-transparent"}`}
          style={{ height: active ? [10, 6, 8][i] : 0, animationDelay: `${i * 0.2}s` }} />
      ))}
    </div>
  );
}

export default function PlayerPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [settings, setSettings] = useState<SiteSettings>({ id: "", title: "THESANDALVAULT", subtitle: "ideas, drafts, and loops", logo_path: null, spotlight_title: null, spotlight_bio: null, spotlight_artwork_path: null, show_tracks_on_homepage: true });
  const [logoSrc, setLogoSrc] = useState<string | null>(null);
  const [spotlight, setSpotlight] = useState<Track[]>([]);
  const [spotlightArt, setSpotlightArt] = useState<Record<string, string>>({});
  const [spotlightExpanded, setSpotlightExpanded] = useState(false);
  const [spotlightCover, setSpotlightCover] = useState<string | null>(null);

  const { tracks, setTracks, current, isPlaying, playTrack, togglePlay, setExpanded } = usePlayer();

  useEffect(() => {
    Promise.all([getSettings(), getPublicTracks(), getSpotlightTracks()])
      .then(async ([s, t, sp]) => {
        setSettings(s); setTracks(t); setSpotlight(sp);
        if (s.logo_path) { try { setLogoSrc(await getLogoUrl(s.logo_path)); } catch {} }
        if (s.spotlight_artwork_path) { try { setSpotlightCover(await getSignedUrl(s.spotlight_artwork_path)); } catch {} }
        const artUrls: Record<string, string> = {};
        for (const track of sp) {
          if (track.artwork_path) {
            try { artUrls[track.id] = await getSignedUrl(track.artwork_path); } catch {}
          }
        }
        setSpotlightArt(artUrls);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen flex flex-col pb-28">
      <header className="px-6 py-5 flex items-center justify-between border-b border-bg-3">
        <button onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          className="flex items-center gap-3 active:scale-[0.97] active:opacity-80 transition-all cursor-pointer">
          {logoSrc ? <img src={logoSrc} alt="" className="w-8 h-8 rounded-full object-cover" /> : (
            <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center"><span className="text-black text-xs font-bold">{settings.title.charAt(0)}</span></div>
          )}
          <div className="text-left">
            <h1 className="text-sm font-semibold tracking-wide uppercase">{settings.title}</h1>
            <p className="text-[10px] text-muted font-mono tracking-widest lowercase">{settings.subtitle}</p>
          </div>
        </button>
        <div className="flex items-center gap-4">
          <span className="text-[10px] text-dim font-mono">{tracks.length} TRACK{tracks.length !== 1 ? "S" : ""}</span>
          <Link href="/admin" className="text-[10px] text-dim font-mono hover:text-accent transition-colors uppercase tracking-wider">Admin →</Link>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-4 py-4">
        {loading ? (
          <div className="flex items-center justify-center h-64"><div className="text-muted text-sm font-mono animate-pulse">Loading tracks...</div></div>
        ) : error ? (
          <div className="flex items-center justify-center h-64 text-center px-4"><div><p className="text-red-400 text-sm font-mono mb-2">Connection Error</p><p className="text-dim text-xs font-mono max-w-sm">{error}</p></div></div>
        ) : (
          <div className="max-w-2xl mx-auto">

            {/* ─── SPOTLIGHT ─── */}
            {spotlight.length > 0 && (
              <div className="mb-8 rounded-xl overflow-hidden fade-up" style={{ background: "#0a0a0a" }}>
                {/* Header - clickable to /spotlight */}
                <Link href="/spotlight" className="flex gap-4 p-4 group">
                  <div className="flex-shrink-0">
                    {spotlightCover ? (
                      <img src={spotlightCover} alt="" className="w-20 h-20 sm:w-24 sm:h-24 rounded-lg object-cover group-hover:opacity-90 transition-opacity" />
                    ) : spotlightArt[spotlight[0].id] ? (
                      <img src={spotlightArt[spotlight[0].id]} alt="" className="w-20 h-20 sm:w-24 sm:h-24 rounded-lg object-cover group-hover:opacity-90 transition-opacity" />
                    ) : (
                      <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-lg bg-bg-3 flex items-center justify-center">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-dim"><path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" /></svg>
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0 flex flex-col justify-center">
                    <p className="text-[10px] text-dim font-mono uppercase tracking-widest">THESANDALGOD</p>
                    <p className="text-base font-semibold group-hover:text-white transition-colors">{settings.spotlight_title || "Spotlight"}</p>
                    {settings.spotlight_bio && (
                      <p className="text-[11px] text-muted/50 mt-1 line-clamp-2">{settings.spotlight_bio}</p>
                    )}
                    <p className="text-[10px] text-dim font-mono mt-1.5">{spotlight.length} track{spotlight.length !== 1 ? "s" : ""}</p>
                  </div>
                  <div className="flex items-center flex-shrink-0">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-dim group-hover:text-muted transition-colors"><path d="M9 18l6-6-6-6" /></svg>
                  </div>
                </Link>
              </div>
            )}

            {settings.show_tracks_on_homepage && (
              tracks.length === 0 ? (
                <div className="flex items-center justify-center h-48 text-center"><div><p className="text-muted text-sm">No tracks yet</p><Link href="/admin" className="text-dim text-xs font-mono hover:text-accent transition-colors">Upload from /admin →</Link></div></div>
              ) : (
                <div className="space-y-1">
                  <div className="grid grid-cols-[1fr_50px] px-3 py-2 text-[10px] text-dim font-mono uppercase tracking-widest">
                    <span>Title</span><span className="text-right">Dur</span>
                  </div>
                  {tracks.map((track, i) => {
                    const isCurrent = current?.id === track.id;
                    return (
                      <button key={track.id} onClick={() => { if (isCurrent) { togglePlay(); } else { playTrack(track); setExpanded(true); } }}
                        className={`w-full grid grid-cols-[1fr_50px] items-center px-3 py-3 rounded-lg transition-all duration-200 text-left group fade-up ${isCurrent ? "bg-bg-3 text-white" : "hover:bg-bg-2 text-accent/70 hover:text-accent"}`}
                        style={{ animationDelay: `${i * 30}ms` }}>
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-5 flex-shrink-0 flex justify-center">
                            {isCurrent && isPlaying ? <EqBars active /> : <span className="text-xs text-dim group-hover:text-muted font-mono">{String(i + 1).padStart(2, "0")}</span>}
                          </div>
                          <span className={`text-sm truncate ${isCurrent ? "font-semibold" : "font-medium"}`}>{track.title}</span>
                        </div>
                        <span className="text-xs text-dim font-mono text-right">{fmt(track.duration)}</span>
                      </button>
                    );
                  })}
                </div>
              )
            )}

            {!settings.show_tracks_on_homepage && spotlight.length > 0 && (
              <div className="text-center mt-2">
                <Link href="/spotlight" className="text-[10px] font-mono text-dim hover:text-accent transition-colors uppercase tracking-widest">
                  View all tracks →
                </Link>
              </div>
            )}

            {/* ─── ASK THE VAULT ─── */}
            <div className="mt-10 mb-12">
              <VaultOrb />
            </div>

          </div>
        )}
      </main>
    </div>
  );
}
