"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { getProjectBySlug, getProjectTracks, getSettings, getSignedUrl, getLogoUrl, sendMessage, type Track, type Project, type SiteSettings } from "@/lib/supabase";
import { usePlayer } from "@/lib/player-context";

function fmt(s: number | null): string {
  if (!s || s <= 0) return "0:00";
  return `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, "0")}`;
}

function fmtDate(s: string | null | undefined): string {
  if (!s) return "";
  const d = new Date(s);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function totalDuration(tracks: Track[]): string {
  const secs = tracks.reduce((a, t) => a + (t.duration || 0), 0);
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = Math.floor(secs % 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m ${s}s`;
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
  const [settings, setSettings] = useState<SiteSettings>({ id: "", title: "THESANDALVAULT", subtitle: "ideas, drafts, and loops", logo_path: null, spotlight_title: null, spotlight_bio: null, spotlight_artwork_path: null, show_tracks_on_homepage: true, show_beats: true, show_freestyles: true, show_throwaways: true, show_spotlight: true, show_orb: true, show_radio: true });
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [logoSrc, setLogoSrc] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

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
        setProjectTracks(t); setTracks(t);
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
      lastNoteTime.current = Date.now(); setNoteText(""); setNoteStatus("sent");
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

  const CoverArt = ({ className }: { className?: string }) => coverUrl
    ? <img src={coverUrl} alt="" className={`object-cover shadow-2xl ${className}`} />
    : <div className={`bg-bg-2 flex items-center justify-center ${className}`} style={{ border: "1px solid #1a1a1a" }}>
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="text-dim"><path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" /></svg>
      </div>;

  const TrackRow = ({ track, index }: { track: Track; index: number }) => {
    const isCurrent = current?.id === track.id;
    return (
      <button
        onClick={() => { if (isCurrent) { togglePlay(); } else { playTrack(track); } }}
        className={`w-full flex items-center px-3 py-2.5 rounded-md transition-all duration-150 text-left group
          ${isCurrent ? "bg-white/[0.07] text-white" : "hover:bg-white/[0.04] text-accent/60 hover:text-accent"}`}
      >
        <div className="w-8 flex-shrink-0 flex justify-center">
          {isCurrent && isPlaying
            ? <EqBars active />
            : <span className={`text-xs font-mono ${isCurrent ? "text-white" : "text-dim group-hover:text-muted"}`}>{index + 1}</span>
          }
        </div>
        <span className={`flex-1 text-sm truncate min-w-0 ${isCurrent ? "font-medium text-white" : ""}`}>{track.title}</span>
        <span className="hidden lg:block text-xs text-dim font-mono w-14 text-right flex-shrink-0">{fmtDate(track.created_at)}</span>
        <span className="text-xs text-dim font-mono w-12 text-right flex-shrink-0 ml-2">{fmt(track.duration)}</span>
      </button>
    );
  };

  return (
    <div className="min-h-screen flex flex-col pb-28" style={{ background: "#0a0a0a" }}>

      {/* ─── HEADER ─── */}
      <header className="flex items-center justify-between px-4 lg:px-6 py-4 flex-shrink-0">
        <Link href="/"
          className="w-9 h-9 rounded-full flex items-center justify-center transition-colors hover:bg-white/10 active:bg-white/20"
          style={{ WebkitTapHighlightColor: "transparent" }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-accent/70"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
        </Link>
        <div className="flex items-center gap-2">
          {logoSrc && <img src={logoSrc} alt="" className="w-6 h-6 rounded-full object-cover opacity-60" />}
          <span className="text-[10px] text-dim font-mono uppercase tracking-widest hidden sm:block">{settings.title}</span>
        </div>
        <div className="w-9" />
      </header>

      {/* ─── MOBILE (< lg) ─── */}
      <div className="lg:hidden flex-1 px-4 py-2">
        <div className="flex flex-col items-center gap-5 mb-6">
          <CoverArt className="w-52 h-52 rounded-xl" />
          <div className="text-center">
            <p className="text-[10px] text-dim font-mono uppercase tracking-widest mb-1">THESANDALGOD</p>
            <h2 className="text-2xl font-bold mb-1">{project.title}</h2>
            <p className="text-xs text-dim font-mono">{tracks.length} tracks · {totalDuration(tracks)}</p>
            {project.description && <p className="text-sm text-muted/50 mt-2 leading-relaxed">{project.description}</p>}
          </div>
          <button onClick={playAll} className="flex items-center gap-2 px-6 py-2.5 bg-white text-black text-sm font-semibold rounded-full hover:bg-accent transition-colors">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
            Play
          </button>
        </div>
        <div className="space-y-0.5">
          {tracks.length === 0
            ? <p className="text-muted text-sm text-center py-12">No tracks yet</p>
            : tracks.map((track, i) => <TrackRow key={track.id} track={track} index={i} />)
          }
        </div>
        {/* Mobile note */}
        <div className="mt-10 mb-8 max-w-md mx-auto">
          <p className="text-[10px] text-dim font-mono uppercase tracking-widest mb-3">leave a note</p>
          <textarea value={noteText} onChange={(e) => setNoteText(e.target.value.slice(0, 250))}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSendNote(); } }}
            placeholder="..." rows={2}
            className="w-full px-4 py-3 bg-transparent text-sm text-accent/70 placeholder:text-dim/30 focus:outline-none resize-none font-mono"
            style={{ borderBottom: "1px solid #1a1a1a" }} disabled={noteSending} />
          <div className="flex items-center justify-between mt-2">
            <span className="text-[9px] font-mono text-dim/30">{noteText.length}/250</span>
            <div className="flex items-center gap-3">
              {noteStatus === "sent" && <span className="text-[10px] font-mono text-green-400/60">sent</span>}
              {noteStatus === "error" && <span className="text-[10px] font-mono text-red-400/60">wait a moment</span>}
              <button onClick={handleSendNote} disabled={!noteText.trim() || noteSending}
                className="text-[10px] font-mono text-dim hover:text-accent transition-colors disabled:text-dim/20 uppercase tracking-widest">
                {noteSending ? "..." : "send"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ─── DESKTOP (lg+) ─── */}
      <div className="hidden lg:flex flex-1 min-h-0 gap-0">

        {/* LEFT — sticky cover panel */}
        <div className="w-[340px] xl:w-[380px] flex-shrink-0 flex flex-col items-start px-8 py-4 sticky top-0 self-start">
          <CoverArt className="w-full aspect-square rounded-xl mb-6" />

          <p className="text-[10px] text-dim font-mono uppercase tracking-widest mb-1">THESANDALGOD</p>
          <h2 className="text-2xl xl:text-3xl font-bold mb-1 leading-tight">{project.title}</h2>
          <p className="text-xs text-dim font-mono mb-3">
            thesandalgod · {tracks.length} track{tracks.length !== 1 ? "s" : ""} · {totalDuration(tracks)}
          </p>
          {project.description && (
            <p className="text-sm text-muted/50 mb-5 leading-relaxed">{project.description}</p>
          )}

          <div className="flex items-center gap-3 mb-6">
            <button onClick={playAll}
              className="w-11 h-11 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 transition-transform">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
            </button>
          </div>

          {/* Desktop: leave a note */}
          <div className="w-full mt-2">
            <p className="text-[9px] text-dim font-mono uppercase tracking-widest mb-2">leave a note</p>
            <textarea value={noteText} onChange={(e) => setNoteText(e.target.value.slice(0, 250))}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSendNote(); } }}
              placeholder="..." rows={2}
              className="w-full px-3 py-2 bg-transparent text-sm text-accent/70 placeholder:text-dim/30 focus:outline-none resize-none font-mono"
              style={{ borderBottom: "1px solid #1a1a1a" }} disabled={noteSending} />
            <div className="flex items-center justify-between mt-1.5">
              <span className="text-[9px] font-mono text-dim/30">{noteText.length}/250</span>
              <div className="flex items-center gap-2">
                {noteStatus === "sent" && <span className="text-[9px] font-mono text-green-400/60">sent</span>}
                {noteStatus === "error" && <span className="text-[9px] font-mono text-red-400/60">wait</span>}
                <button onClick={handleSendNote} disabled={!noteText.trim() || noteSending}
                  className="text-[9px] font-mono text-dim hover:text-accent transition-colors disabled:text-dim/20 uppercase tracking-widest">
                  {noteSending ? "..." : "send"}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT — scrollable track list */}
        <div className="flex-1 min-w-0 overflow-y-auto px-6 py-4">
          <div className="flex items-center px-3 pb-2 mb-1" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
            <div className="w-8 flex-shrink-0" />
            <span className="flex-1 text-[10px] text-dim font-mono uppercase tracking-widest">Title</span>
            <span className="hidden lg:block text-[10px] text-dim font-mono uppercase tracking-widest w-14 text-right flex-shrink-0">Date</span>
            <span className="text-[10px] text-dim font-mono uppercase tracking-widest w-12 text-right flex-shrink-0 ml-2">Dur</span>
          </div>
          <div className="space-y-0.5 mt-2">
            {tracks.length === 0
              ? <p className="text-muted text-sm text-center py-12">No tracks yet</p>
              : tracks.map((track, i) => <TrackRow key={track.id} track={track} index={i} />)
            }
          </div>
        </div>
      </div>
    </div>
  );
}
