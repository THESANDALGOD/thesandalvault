"use client";

import { useState } from "react";
import { usePlayer } from "@/lib/player-context";

function fmt(s: number | null): string {
  if (!s || s <= 0) return "0:00";
  return `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, "0")}`;
}

type RepeatMode = "off" | "all" | "one";

const RepeatIcon = ({ mode }: { mode: RepeatMode }) => (
  <div className="relative">
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      className={mode === "off" ? "text-dim" : "text-white"}>
      <path d="M17 1l4 4-4 4" /><path d="M3 11V9a4 4 0 0 1 4-4h14" /><path d="M7 23l-4-4 4-4" /><path d="M21 13v2a4 4 0 0 1-4 4H3" />
    </svg>
    {mode === "one" && <span className="absolute -top-1 -right-1 text-[8px] font-mono font-bold text-white">1</span>}
  </div>
);

const ShuffleIcon = ({ on }: { on: boolean }) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
    className={on ? "text-white" : "text-dim"}>
    <path d="M16 3h5v5" /><path d="M4 20L21 3" /><path d="M21 16v5h-5" /><path d="M15 15l6 6" /><path d="M4 4l5 5" />
  </svg>
);

export default function PersistentPlayer() {
  const {
    current, isPlaying, progress, currentTime, duration, volume, repeatMode, shuffle, expanded,
    artworkUrl, videoUrl, togglePlay, skip, seek, setVolume, cycleRepeat, toggleShuffle, setExpanded,
  } = usePlayer();

  const [showLyrics, setShowLyrics] = useState(false);

  if (!current) return null;

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => seek(parseFloat(e.target.value));
  const handleVolume = (e: React.ChangeEvent<HTMLInputElement>) => setVolume(parseFloat(e.target.value));

  // ─── FULL-SCREEN PLAYER ───
  if (expanded) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col" style={{ background: "#000" }}>
        {videoUrl ? (
          <video key={videoUrl} autoPlay loop muted playsInline className="absolute inset-0 w-full h-full object-cover" style={{ opacity: showLyrics ? 0.1 : 0.3 }}>
            <source src={videoUrl} type="video/mp4" />
          </video>
        ) : artworkUrl ? (
          <div className="absolute inset-0" style={{ backgroundImage: `url(${artworkUrl})`, backgroundSize: "cover", backgroundPosition: "center", opacity: 0.15, filter: "blur(40px)" }} />
        ) : (
          <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse at center, #111 0%, #000 70%)" }} />
        )}
        <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0.4) 0%, rgba(0,0,0,0.8) 100%)" }} />

        <div className="relative z-10 flex flex-col h-full">
          <div className="flex items-center justify-between px-6 py-4">
            <button onClick={() => setExpanded(false)} className="text-muted hover:text-white transition-colors">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
            </button>
            <span className="text-[9px] font-mono text-dim uppercase tracking-widest">Now Playing</span>
            <div className="w-5" />
          </div>

          <div className="flex-1 flex flex-col items-center justify-center px-8 overflow-hidden">
            {showLyrics && current.lyrics ? (
              /* ─── LYRICS VIEW ─── */
              <div className="w-full max-w-md flex flex-col items-center h-full justify-center">
                <div className="flex items-center gap-2 mb-4">
                  <h3 className="text-sm font-semibold">{current.title}</h3>
                  <span className="text-[10px] text-muted font-mono">{current.version}</span>
                </div>
                <div className="flex-1 overflow-y-auto w-full max-h-[50vh] px-2 mb-4" style={{ maskImage: "linear-gradient(to bottom, transparent 0%, black 8%, black 92%, transparent 100%)", WebkitMaskImage: "linear-gradient(to bottom, transparent 0%, black 8%, black 92%, transparent 100%)" }}>
                  <p className="text-sm text-center text-accent/80 leading-[2] whitespace-pre-wrap font-mono py-4">{current.lyrics}</p>
                </div>
                <button onClick={() => setShowLyrics(false)}
                  className="text-[10px] font-mono text-dim hover:text-accent transition-colors uppercase tracking-widest">
                  hide lyrics
                </button>
              </div>
            ) : (
              /* ─── ARTWORK VIEW ─── */
              <>
                {artworkUrl ? (
                  <img src={artworkUrl} alt="" className="w-56 h-56 sm:w-72 sm:h-72 rounded-xl object-cover shadow-2xl mb-8" />
                ) : (
                  <div className="w-56 h-56 sm:w-72 sm:h-72 rounded-xl bg-bg-2 flex items-center justify-center mb-8" style={{ border: "1px solid #222" }}>
                    <span className="text-4xl font-bold text-dim">{current.title.charAt(0)}</span>
                  </div>
                )}
                <h2 className="text-xl sm:text-2xl font-semibold text-center mb-1">{current.title}</h2>
                <p className="text-sm text-muted font-mono mb-4">{current.version}</p>
                {current.lyrics && (
                  <button onClick={() => setShowLyrics(true)}
                    className="text-[10px] font-mono text-dim hover:text-accent transition-colors uppercase tracking-widest mb-4">
                    view lyrics
                  </button>
                )}
              </>
            )}
          </div>

          <div className="px-6 pb-8" style={{ paddingBottom: "calc(2rem + env(safe-area-inset-bottom, 0px))" }}>
            <div className="flex items-center gap-3 mb-6 max-w-md mx-auto">
              <span className="text-[10px] text-dim font-mono w-8 text-right">{fmt(currentTime)}</span>
              <input type="range" min={0} max={100} step={0.1} value={progress} onChange={handleSeek} className="flex-1"
                style={{ background: `linear-gradient(to right, #e2e2e2 ${progress}%, #333 ${progress}%)` }} />
              <span className="text-[10px] text-dim font-mono w-8">{fmt(duration)}</span>
            </div>
            <div className="flex items-center justify-center gap-8">
              <button onClick={toggleShuffle} className="transition-colors p-2"><ShuffleIcon on={shuffle} /></button>
              <button onClick={() => skip(-1)} className="text-muted hover:text-white transition-colors p-2">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M6 6h2v12H6zm3.5 6 8.5 6V6z" /></svg>
              </button>
              <button onClick={togglePlay} className="w-14 h-14 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 transition-transform">
                {isPlaying ? <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M6 4h4v16H6zM14 4h4v16h-4z" /></svg> : <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>}
              </button>
              <button onClick={() => skip(1)} className="text-muted hover:text-white transition-colors p-2">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" /></svg>
              </button>
              <button onClick={cycleRepeat} className="transition-colors p-2"><RepeatIcon mode={repeatMode} /></button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── MINI PLAYER BAR ───
  return (
    <div className="fixed bottom-0 left-0 w-full z-40 border-t border-bg-3 bg-bg-1/95 backdrop-blur-xl px-4 py-3" style={{ paddingBottom: "calc(12px + env(safe-area-inset-bottom, 0px))" }}>
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-3 mb-3">
          <span className="text-[10px] text-dim font-mono w-8 text-right">{fmt(currentTime)}</span>
          <input type="range" min={0} max={100} step={0.1} value={progress} onChange={handleSeek} className="flex-1"
            style={{ background: `linear-gradient(to right, #e2e2e2 ${progress}%, #333 ${progress}%)` }} />
          <span className="text-[10px] text-dim font-mono w-8">{fmt(duration)}</span>
        </div>
        <div className="flex items-center justify-between">
          <button onClick={() => setExpanded(true)} className="flex-1 min-w-0 text-left">
            <p className="text-sm font-semibold truncate">{current.title}</p>
            <p className="text-[10px] text-muted font-mono">{current.version}</p>
          </button>
          <div className="flex items-center gap-4">
            <button onClick={() => skip(-1)} className="text-muted hover:text-white transition-colors"><svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M6 6h2v12H6zm3.5 6 8.5 6V6z" /></svg></button>
            <button onClick={togglePlay} className="w-10 h-10 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 transition-transform">
              {isPlaying ? <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M6 4h4v16H6zM14 4h4v16h-4z" /></svg> : <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>}
            </button>
            <button onClick={() => skip(1)} className="text-muted hover:text-white transition-colors"><svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" /></svg></button>
          </div>
          <div className="volume-control flex-1 flex justify-end items-center gap-2">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-dim"><path d="M11 5 6 9H2v6h4l5 4V5zM19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" /></svg>
            <input type="range" min={0} max={1} step={0.01} value={volume} onChange={handleVolume} className="w-20"
              style={{ background: `linear-gradient(to right, #666 ${volume * 100}%, #333 ${volume * 100}%)` }} />
          </div>
        </div>
      </div>
    </div>
  );
}
