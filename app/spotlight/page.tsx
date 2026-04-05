"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getSpotlightTracks, getSettings, getSignedUrl, getLogoUrl, type Track, type SiteSettings } from "@/lib/supabase";
import { usePlayer } from "@/lib/player-context";

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

export default function SpotlightPage() {
  const [spotlightTracks, setSpotlightTracks] = useState<Track[]>([]);
  const [settings, setSettings] = useState<SiteSettings>({ id: "", title: "THESANDALVAULT", subtitle: "ideas, drafts, and loops", logo_path: null, spotlight_title: null, spotlight_bio: null, spotlight_artwork_path: null });
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [logoSrc, setLogoSrc] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const { current, isPlaying, playTrack, togglePlay, setExpanded, setTracks } = usePlayer();

  useEffect(() => {
    Promise.all([getSettings(), getSpotlightTracks()])
      .then(async ([s, sp]) => {
        setSettings(s);
        setSpotlightTracks(sp);
        setTracks(sp);
        if (s.logo_path) { try { setLogoSrc(await getLogoUrl(s.logo_path)); } catch {} }
        if (s.spotlight_artwork_path) { try { setCoverUrl(await getSignedUrl(s.spotlight_artwork_path)); } catch {} }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><div className="text-muted text-sm font-mono animate-pulse">Loading...</div></div>;
  }

  const playAll = () => {
    if (spotlightTracks.length > 0) {
      playTrack(spotlightTracks[0]);
      setExpanded(true);
    }
  };

  return (
    <div className="min-h-screen flex flex-col pb-28">
      <header className="px-6 py-5 flex items-center justify-between border-b border-bg-3">
        <div className="flex items-center gap-3">
          {logoSrc ? <img src={logoSrc} alt="" className="w-8 h-8 rounded-full object-cover" /> : (
            <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center"><span className="text-black text-xs font-bold">{settings.title.charAt(0)}</span></div>
          )}
          <div>
            <h1 className="text-sm font-semibold tracking-wide uppercase">{settings.title}</h1>
            <p className="text-[10px] text-muted font-mono tracking-widest lowercase">{settings.subtitle}</p>
          </div>
        </div>
        <Link href="/" className="text-[10px] text-dim font-mono hover:text-accent transition-colors uppercase tracking-wider">← Back</Link>
      </header>

      <main className="flex-1 px-4 py-6">
        <div className="max-w-2xl mx-auto">
          {/* Playlist header */}
          <div className="flex flex-col sm:flex-row gap-6 mb-8 items-center sm:items-start">
            <div className="flex-shrink-0">
              {coverUrl ? (
                <img src={coverUrl} alt="" className="w-48 h-48 sm:w-56 sm:h-56 rounded-xl object-cover shadow-2xl" />
              ) : (
                <div className="w-48 h-48 sm:w-56 sm:h-56 rounded-xl bg-bg-2 flex items-center justify-center" style={{ border: "1px solid #222" }}>
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="text-dim"><path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" /></svg>
                </div>
              )}
            </div>
            <div className="flex flex-col justify-end text-center sm:text-left flex-1 min-w-0">
              <p className="text-[10px] text-dim font-mono uppercase tracking-widest mb-1">Playlist</p>
              <h2 className="text-2xl sm:text-3xl font-bold mb-2">{settings.spotlight_title || "Spotlight"}</h2>
              {settings.spotlight_bio && (
                <p className="text-sm text-muted/60 mb-3 leading-relaxed">{settings.spotlight_bio}</p>
              )}
              <div className="flex items-center gap-4 justify-center sm:justify-start">
                <button onClick={playAll}
                  className="w-12 h-12 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 transition-transform">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
                </button>
                <span className="text-[11px] text-dim font-mono">{spotlightTracks.length} track{spotlightTracks.length !== 1 ? "s" : ""}</span>
              </div>
            </div>
          </div>

          {/* Track list */}
          {spotlightTracks.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted text-sm">No tracks in spotlight yet</p>
            </div>
          ) : (
            <div className="space-y-1">
              <div className="grid grid-cols-[1fr_50px] px-3 py-2 text-[10px] text-dim font-mono uppercase tracking-widest">
                <span>Title</span><span className="text-right">Dur</span>
              </div>
              {spotlightTracks.map((track, i) => {
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
          )}
        </div>
      </main>
    </div>
  );
}
