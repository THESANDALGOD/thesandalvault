"use client";

import { useEffect, useState, useRef } from "react";
import { getPublicTracks, getSpotlightTracks, getSignedUrl, getSettings, getLogoUrl, sendMessage, type Track, type SiteSettings } from "@/lib/supabase";
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

export default function PlayerPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [settings, setSettings] = useState<SiteSettings>({ id: "", title: "THESANDALVAULT", subtitle: "ideas, drafts, and loops", logo_path: null, spotlight_title: null, spotlight_bio: null, spotlight_artwork_path: null });
  const [logoSrc, setLogoSrc] = useState<string | null>(null);
  const [spotlight, setSpotlight] = useState<Track[]>([]);
  const [spotlightArt, setSpotlightArt] = useState<Record<string, string>>({});
  const [spotlightExpanded, setSpotlightExpanded] = useState(false);
  const [spotlightCover, setSpotlightCover] = useState<string | null>(null);

  const [noteText, setNoteText] = useState("");
  const [noteSending, setNoteSending] = useState(false);
  const [noteStatus, setNoteStatus] = useState<"idle" | "sent" | "error">("idle");
  const lastNoteTime = useRef(0);

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

  const handleSendNote = async () => {
    if (!noteText.trim() || noteSending) return;
    const now = Date.now();
    if (now - lastNoteTime.current < 15000) { setNoteStatus("error"); setTimeout(() => setNoteStatus("idle"), 2000); return; }
    setNoteSending(true); setNoteStatus("idle");
    try {
      await sendMessage(noteText.trim().slice(0, 250));
      lastNoteTime.current = Date.now();
      setNoteText(""); setNoteStatus("sent");
      setTimeout(() => setNoteStatus("idle"), 2500);
    } catch { setNoteStatus("error"); setTimeout(() => setNoteStatus("idle"), 2000); }
    setNoteSending(false);
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
        <div className="flex items-center gap-4">
          <span className="text-[10px] text-dim font-mono">{tracks.length} TRACK{tracks.length !== 1 ? "S" : ""}</span>
          <a href="/admin" className="text-[10px] text-dim font-mono hover:text-accent transition-colors uppercase tracking-wider">Admin →</a>
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
                <a href="/spotlight" className="flex gap-4 p-4 pb-3 group">
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
                </a>

                {/* Preview tracks */}
                <div className="px-2 pb-2">
                  {spotlight.slice(0, 3).map((track, i) => {
                    const isCurrent = current?.id === track.id;
                    return (
                      <button key={track.id} onClick={() => { if (isCurrent) { togglePlay(); } else { playTrack(track); setExpanded(true); } }}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-left group ${isCurrent ? "bg-bg-3" : "hover:bg-bg-2"}`}>
                        {spotlightArt[track.id] ? (
                          <img src={spotlightArt[track.id]} alt="" className="w-8 h-8 rounded object-cover flex-shrink-0" />
                        ) : (
                          <div className="w-8 h-8 rounded bg-bg-3 flex items-center justify-center flex-shrink-0">
                            <span className="text-[10px] font-bold text-dim">{track.title.charAt(0)}</span>
                          </div>
                        )}
                        <span className="text-xs text-dim font-mono w-4 flex-shrink-0">{i + 1}</span>
                        <span className={`text-sm truncate flex-1 ${isCurrent ? "text-white font-semibold" : "text-accent/70 group-hover:text-accent"}`}>{track.title}</span>
                      </button>
                    );
                  })}
                  {spotlight.length > 3 && (
                    <a href="/spotlight"
                      className="block w-full py-2 text-[10px] font-mono text-dim hover:text-accent transition-colors uppercase tracking-widest text-center mt-1">
                      View all {spotlight.length} tracks →
                    </a>
                  )}
                </div>
              </div>
            )}

            {tracks.length === 0 ? (
              <div className="flex items-center justify-center h-48 text-center"><div><p className="text-muted text-sm">No tracks yet</p><a href="/admin" className="text-dim text-xs font-mono hover:text-accent transition-colors">Upload from /admin →</a></div></div>
            ) : (
              <div className="space-y-1">
                <div className="grid grid-cols-[1fr_60px_50px] px-3 py-2 text-[10px] text-dim font-mono uppercase tracking-widest">
                  <span>Title</span><span className="text-right">Ver</span><span className="text-right">Dur</span>
                </div>
                {tracks.map((track, i) => {
                  const isCurrent = current?.id === track.id;
                  return (
                    <button key={track.id} onClick={() => { if (isCurrent) { togglePlay(); } else { playTrack(track); setExpanded(true); } }}
                      className={`w-full grid grid-cols-[1fr_60px_50px] items-center px-3 py-3 rounded-lg transition-all duration-200 text-left group fade-up ${isCurrent ? "bg-bg-3 text-white" : "hover:bg-bg-2 text-accent/70 hover:text-accent"}`}
                      style={{ animationDelay: `${i * 30}ms` }}>
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-5 flex-shrink-0 flex justify-center">
                          {isCurrent && isPlaying ? <EqBars active /> : <span className="text-xs text-dim group-hover:text-muted font-mono">{String(i + 1).padStart(2, "0")}</span>}
                        </div>
                        <span className={`text-sm truncate ${isCurrent ? "font-semibold" : "font-medium"}`}>{track.title}</span>
                      </div>
                      <span className="text-xs text-muted font-mono text-right">{track.version}</span>
                      <span className="text-xs text-dim font-mono text-right">{fmt(track.duration)}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Leave a note */}
            <div className="mt-12 mb-8 max-w-md mx-auto">
              <p className="text-[10px] text-dim font-mono uppercase tracking-widest mb-3">leave a note</p>
              <div className="relative">
                <textarea
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value.slice(0, 250))}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSendNote(); } }}
                  placeholder="..."
                  rows={2}
                  className="w-full px-4 py-3 bg-transparent text-sm text-accent/70 placeholder:text-dim/30 focus:outline-none resize-none font-mono"
                  style={{ borderBottom: "1px solid #1a1a1a" }}
                  disabled={noteSending}
                />
                <div className="flex items-center justify-between mt-2">
                  <span className="text-[9px] font-mono text-dim/30">{noteText.length}/250</span>
                  <div className="flex items-center gap-3">
                    {noteStatus === "sent" && <span className="text-[10px] font-mono text-green-400/60 fade-up">sent</span>}
                    {noteStatus === "error" && <span className="text-[10px] font-mono text-red-400/60 fade-up">wait a moment</span>}
                    <button onClick={handleSendNote} disabled={!noteText.trim() || noteSending}
                      className="text-[10px] font-mono text-dim hover:text-accent transition-colors disabled:text-dim/20 disabled:cursor-default uppercase tracking-widest">
                      {noteSending ? "..." : "send"}
                    </button>
                  </div>
                </div>
              </div>
            </div>

          </div>
        )}
      </main>
    </div>
  );
}
