"use client";

import { useEffect, useState, useRef } from "react";
import { getPublicTracks, getSettings, getLogoUrl, sendMessage, type Track, type SiteSettings } from "@/lib/supabase";
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
  const [settings, setSettings] = useState<SiteSettings>({ id: "", title: "THESANDALVAULT", subtitle: "ideas, drafts, and loops", logo_path: null });
  const [logoSrc, setLogoSrc] = useState<string | null>(null);

  const [noteText, setNoteText] = useState("");
  const [noteSending, setNoteSending] = useState(false);
  const [noteStatus, setNoteStatus] = useState<"idle" | "sent" | "error">("idle");
  const lastNoteTime = useRef(0);

  const { tracks, setTracks, current, isPlaying, playTrack, togglePlay, setExpanded } = usePlayer();

  useEffect(() => {
    Promise.all([getSettings(), getPublicTracks()])
      .then(async ([s, t]) => {
        setSettings(s); setTracks(t);
        if (s.logo_path) { try { setLogoSrc(await getLogoUrl(s.logo_path)); } catch {} }
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
    <div className="min-h-screen flex flex-col mobile-scroll">
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
