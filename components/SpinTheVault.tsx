"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { usePlayer } from "@/lib/player-context";
import type { Track } from "@/lib/supabase";

const TAGLINES = [
  "spin the vault",
  "press your luck",
  "don't think. just press it.",
  "somewhere on here is your song",
  "let the vault decide",
  "a random trip",
];

export default function SpinTheVault({ tracks }: { tracks: Track[] }) {
  const { playTrack, current } = usePlayer();

  const [spinning, setSpinning] = useState(false);
  const [lastTrack, setLastTrack] = useState<Track | null>(null);
  const [taglineIndex] = useState(() => Math.floor(Math.random() * TAGLINES.length));

  // Parallax refs (pure DOM, no re-renders)
  const planetRef = useRef<HTMLButtonElement>(null);
  const highlightRef = useRef<HTMLDivElement>(null);
  const currentRotX = useRef(0);
  const currentRotY = useRef(0);
  const targetRotX = useRef(0);
  const targetRotY = useRef(0);
  const rafRef = useRef<number>(0);

  const tick = useCallback(() => {
    currentRotX.current += (targetRotX.current - currentRotX.current) * 0.06;
    currentRotY.current += (targetRotY.current - currentRotY.current) * 0.06;
    if (planetRef.current) {
      planetRef.current.style.transform = `perspective(800px) rotateX(${currentRotX.current}deg) rotateY(${currentRotY.current}deg)`;
    }
    if (highlightRef.current) {
      const hx = 35 + currentRotY.current * 1.2;
      const hy = 25 - currentRotX.current * 1.2;
      highlightRef.current.style.background = `radial-gradient(ellipse at ${hx}% ${hy}%, rgba(255,255,255,0.14) 0%, rgba(255,255,255,0.05) 35%, transparent 65%)`;
    }
    rafRef.current = requestAnimationFrame(tick);
  }, []);

  useEffect(() => {
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [tick]);

  useEffect(() => {
    const onMouse = (e: MouseEvent) => {
      const x = (e.clientX / window.innerWidth - 0.5) * 2;
      const y = (e.clientY / window.innerHeight - 0.5) * 2;
      targetRotY.current = x * 8;
      targetRotX.current = -y * 6;
    };
    window.addEventListener("mousemove", onMouse);
    return () => window.removeEventListener("mousemove", onMouse);
  }, []);

  const handleSpin = () => {
    if (spinning || !tracks.length) return;

    if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate([15, 30, 15]);

    setSpinning(true);

    const pool = tracks.length > 1 && current ? tracks.filter((t) => t.id !== current.id) : tracks;
    const pick = pool[Math.floor(Math.random() * pool.length)];

    setTimeout(() => {
      playTrack(pick);
      setLastTrack(pick);
      setSpinning(false);
    }, 900);
  };

  const noTracks = tracks.length === 0;

  return (
    <div className="flex flex-col items-center w-full">
      <button
        ref={planetRef}
        onClick={handleSpin}
        disabled={noTracks}
        className={`relative w-40 h-40 sm:w-44 sm:h-44 rounded-full planet-float ${spinning ? "planet-spin-burst" : "planet-spin-idle"} ${noTracks ? "opacity-40 cursor-not-allowed" : "cursor-pointer hover:scale-105 active:scale-95"}`}
        style={{ transformStyle: "preserve-3d", willChange: "transform", transition: "transform 0.2s ease" }}
        aria-label="Spin the Vault"
      >
        {/* Outer atmospheric glow */}
        <div className={`absolute inset-0 rounded-full transition-opacity duration-700 ${spinning ? "opacity-80" : "opacity-40"}`} style={{
          background: "radial-gradient(circle, rgba(140,120,200,0.15) 0%, rgba(80,60,150,0.08) 40%, transparent 70%)",
          filter: "blur(22px)",
          transform: "scale(1.45)",
        }} />

        {/* Planet surface */}
        <div className="absolute inset-0 rounded-full overflow-hidden planet-surface" style={{
          background: `
            radial-gradient(ellipse at 32% 28%, #3a2a55 0%, #1f1438 25%, #0d0820 55%, #000 100%)
          `,
          boxShadow: `
            0 0 70px rgba(100,70,180,0.3),
            inset 0 -20px 50px rgba(0,0,0,0.95),
            inset 0 4px 15px rgba(200,180,240,0.1),
            inset 10px 0 25px rgba(30,20,60,0.5)
          `,
          border: "1px solid rgba(255,255,255,0.06)",
        }}>
          {/* Continents / craters */}
          <div className="absolute inset-0 rounded-full opacity-60" style={{
            backgroundImage: `
              radial-gradient(circle at 22% 32%, rgba(120,90,170,0.5) 0%, transparent 18%),
              radial-gradient(circle at 72% 58%, rgba(70,50,120,0.6) 0%, transparent 22%),
              radial-gradient(circle at 42% 78%, rgba(140,110,180,0.4) 0%, transparent 14%),
              radial-gradient(circle at 85% 28%, rgba(90,60,140,0.5) 0%, transparent 12%),
              radial-gradient(circle at 18% 72%, rgba(60,40,100,0.6) 0%, transparent 20%)
            `,
          }} />

          {/* Noise texture */}
          <div className="absolute inset-0 rounded-full mix-blend-overlay opacity-[0.1]" style={{
            backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='100' height='100'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='1.2' numOctaves='2'/></filter><rect width='100%' height='100%' filter='url(%23n)' opacity='0.6'/></svg>")`,
          }} />

          {/* Dynamic highlight */}
          <div ref={highlightRef} className="absolute inset-0 rounded-full pointer-events-none" style={{
            background: "radial-gradient(ellipse at 35% 25%, rgba(255,255,255,0.14) 0%, rgba(255,255,255,0.05) 35%, transparent 65%)",
          }} />

          {/* Terminator shadow */}
          <div className="absolute inset-0 rounded-full pointer-events-none" style={{
            background: "linear-gradient(120deg, transparent 40%, rgba(0,0,0,0.45) 75%, rgba(0,0,0,0.8) 100%)",
          }} />
        </div>

        {/* Spin burst ring */}
        {spinning && (
          <div className="absolute inset-0 rounded-full pointer-events-none planet-burst-ring" style={{
            border: "1px solid rgba(180,160,220,0.35)",
          }} />
        )}
      </button>

      <p className="text-[10px] text-dim/50 font-mono lowercase tracking-[0.2em] mt-6 text-center">
        {TAGLINES[taglineIndex]}
      </p>

      {lastTrack && !spinning && (
        <p className="text-[10px] text-accent/40 font-mono mt-2 text-center fade-up">
          now playing · {lastTrack.title}
        </p>
      )}
    </div>
  );
}
