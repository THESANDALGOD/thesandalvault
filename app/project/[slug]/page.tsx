"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { getProjectBySlug, getProjectTracks, getSettings, getSignedUrl, getLogoUrl, sendMessage, type Track, type Project, type SiteSettings } from "@/lib/supabase";
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

export default function ProjectPage({ params }: { params: { slug: string } }) {
  const [project, setProject] = useState<Project | null>(null);
  const [tracks, setProjectTracks] = useState<Track[]>([]);
  const [settings, setSettings] = useState<SiteSettings>({ id: "", title: "THESANDALVAULT", subtitle: "ideas, drafts, and loops", logo_path: null, spotlight_title: null, spotlight_bio: null, spotlight_artwork_path: null, show_tracks_on_homepage: true, show_beats: true, show_freestyles: true, show_throwaways: true, show_spotlight: true, show_orb: true });
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [logoSrc, setLogoSrc] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Leave a note
  const [noteText, setNoteText] = useState("");
  const [noteSending, setNoteSending] = useState(false);
  const [noteStatus, setNoteStatus] = useState<"idle" | "sent" | "error">("idle");
  const lastNoteTime = useRef(0);

  const { current, isPlaying, playTrack, togglePlay, setExpanded, setTracks } = usePlayer();

  useEffect(() => {
    Promise.all([getSettings(), getProjectBySlug(params.slug)])
      .then(async ([s, p]) => {
        setSettings(s);
        if (!p) { setLoading(false); return; }
        setProject(p);
        const t = await getProjectTracks(p.id);
        setProjectTracks(t);
        setTracks(t);
        if (s.logo_path) { try { setLogoSrc(await getLogoUrl(s.logo_path)); } catch {} }
        if (p.cover_path) { try { setCoverUrl(await getSignedUrl(p.cover_path)); } catch {} }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [params.slug]);

  const playAll = () => {
    if (tracks.length > 0) { playTrack(tracks[0]); setExpanded(true); }
  };

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

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><div className="text-muted text-sm font-mono animate-pulse">Loading...</div></div>;
  }

  if (!project) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center">
          <p className="text-muted text-sm mb-4">Project not found</p>
          <Link href="/" className="text-dim text-xs font-mono hover:text-accent transition-colors">← Back home</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col pb-28">
      <header className="px-6 py-5 flex items-center justify-between border-b border-bg-3">
        <Link href="/" className="flex items-center gap-3 active:scale-[0.97] active:opacity-80 transition-all">
          {logoSrc ? <img src={logoSrc} alt="" className="w-8 h-8 rounded-full object-cover" /> : (
            <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center"><span className="text-black text-xs font-bold">{settings.title.charAt(0)}</span></div>
          )}
          <div>
            <h1 className="text-sm font-semibold tracking-wide uppercase">{settings.title}</h1>
            <p className="text-[10px] text-muted font-mono tracking-widest lowercase">{settings.subtitle}</p>
          </div>
        </Link>
        <Link href="/" className="text-[10px] text-dim font-mono hover:text-accent transition-colors uppercase tracking-wider">← Back</Link>
      </header>

      <main className="flex-1 px-4 py-6">
        <div className="max-w-2xl mx-auto">
          {/* Project header */}
          <div className="flex flex-col sm:flex-row gap-6 items-center sm:items-end mb-8">
            {coverUrl && (
              <img src={coverUrl} alt="" className="w-48 h-48 sm:w-56 sm:h-56 rounded-xl object-cover shadow-2xl flex-shrink-0" />
            )}
            <div className="flex flex-col justify-end text-center sm:text-left flex-1 min-w-0">
              <p className="text-[10px] text-dim font-mono uppercase tracking-widest mb-1">THESANDALGOD</p>
              <h2 className="text-2xl sm:text-3xl font-bold mb-2">{project.title}</h2>
              {project.description && (
                <p className="text-sm text-muted/60 mb-3 leading-relaxed">{project.description}</p>
              )}
              <div className="flex items-center gap-4 justify-center sm:justify-start">
                <button onClick={playAll}
                  className="w-12 h-12 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 transition-transform">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
                </button>
                <span className="text-[11px] text-dim font-mono">{tracks.length} track{tracks.length !== 1 ? "s" : ""}</span>
              </div>
            </div>
          </div>

          {/* Track list */}
          {tracks.length === 0 ? (
            <div className="text-center py-12"><p className="text-muted text-sm">No tracks in this project yet</p></div>
          ) : (
            <div className="space-y-1">
              <div className="grid grid-cols-[1fr_50px] px-3 py-2 text-[10px] text-dim font-mono uppercase tracking-widest">
                <span>Title</span><span className="text-right">Dur</span>
              </div>
              {tracks.map((track, i) => {
                const isCurrent = current?.id === track.id;
                return (
                  <button key={track.id} onClick={() => { if (isCurrent) { togglePlay(); } else { playTrack(track); } }}
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

          {/* Leave a note */}
          <div className="mt-10 mb-8 max-w-md mx-auto">
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
      </main>
    </div>
  );
}
