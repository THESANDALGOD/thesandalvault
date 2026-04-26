"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { getTrackById, getSettings, getLogoUrl, type Track, type SiteSettings } from "@/lib/supabase";
import { usePlayer } from "@/lib/player-context";

function fmt(s: number | null): string {
  if (!s || s <= 0) return "0:00";
  return `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, "0")}`;
}

export default function TrackPage() {
  const params = useParams();
  const trackId = params.id as string;

  const [track, setTrack] = useState<Track | null>(null);
  const [settings, setSettings] = useState<SiteSettings>({ id: "", title: "THESANDALVAULT", subtitle: "ideas, drafts, and loops", logo_path: null, spotlight_title: null, spotlight_bio: null, spotlight_artwork_path: null, show_tracks_on_homepage: true, show_beats: true, show_freestyles: true, show_throwaways: true, show_spotlight: true, show_orb: true, show_radio: true });
  const [logoSrc, setLogoSrc] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { current, isPlaying, playTrack, togglePlay, setTracks } = usePlayer();

  useEffect(() => {
    Promise.all([getTrackById(trackId), getSettings()])
      .then(async ([t, s]) => {
        if (!t) { setError("Track not found"); return; }
        setTrack(t);
        setTracks([t]);
        setSettings(s);
        if (s.logo_path) { try { setLogoSrc(await getLogoUrl(s.logo_path)); } catch {} }
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [trackId]);

  const isCurrent = current?.id === track?.id;

  const handlePlay = () => {
    if (!track) return;
    if (isCurrent) { togglePlay(); } else { playTrack(track); }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><div className="text-muted text-sm font-mono animate-pulse">Loading...</div></div>;
  }

  if (error || !track) {
    return (
      <div className="min-h-screen flex items-center justify-center text-center px-4">
        <div>
          <p className="text-red-400 text-sm font-mono mb-2">{error || "Track not found"}</p>
          <Link href="/" className="text-dim text-xs font-mono hover:text-accent transition-colors">← Back to all tracks</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 pb-28">
      <Link href="/" className="text-center mb-10 block active:scale-[0.97] active:opacity-80 transition-all">
        {logoSrc ? (
          <img src={logoSrc} alt="" className="w-16 h-16 rounded-full object-cover mx-auto mb-3" />
        ) : (
          <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center mx-auto mb-3">
            <span className="text-black text-xl font-bold">{settings.title.charAt(0)}</span>
          </div>
        )}
        <p className="text-[10px] text-muted font-mono tracking-widest uppercase">{settings.title}</p>
      </Link>

      <div className="text-center mb-8">
        <h1 className="text-2xl font-semibold mb-1">{track.title}</h1>
        <p className="text-sm text-muted/60 mb-1">THESANDALGOD</p>
        <p className="text-[10px] text-dim font-mono">{fmt(track.duration)}</p>
      </div>

      <button onClick={handlePlay}
        className="w-16 h-16 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 transition-transform mb-8">
        {isCurrent && isPlaying ? (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M6 4h4v16H6zM14 4h4v16h-4z" /></svg>
        ) : (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
        )}
      </button>

      <Link href="/" className="text-[10px] text-dim font-mono hover:text-accent transition-colors uppercase tracking-widest">← All Tracks</Link>
    </div>
  );
}
