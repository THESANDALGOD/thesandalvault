"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import dynamic from "next/dynamic";
import { usePlayer } from "@/lib/player-context";
import type { Track } from "@/lib/supabase";

// Dynamically import 3D planet — no SSR, lazy load
const Planet3D = dynamic(() => import("./Planet3D"), {
  ssr: false,
  loading: () => <CssFallbackPlanet spinning={false} onTap={() => {}} />,
});

const TAGLINES = [
  "spin the vault",
  "press your luck",
  "don't think. just press it.",
  "somewhere on here is your song",
  "let the vault decide",
  "a random trip",
];

// CSS-only fallback for environments without WebGL
function CssFallbackPlanet({ spinning, onTap }: { spinning: boolean; onTap: () => void }) {
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
      highlightRef.current.style.background = `radial-gradient(ellipse at ${hx}% ${hy}%, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0.04) 35%, transparent 65%)`;
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

  return (
    <button
      ref={planetRef}
      onClick={onTap}
      className={`relative w-40 h-40 sm:w-44 sm:h-44 rounded-full cursor-pointer planet-float ${spinning ? "planet-spin-burst" : "planet-spin-idle"} hover:scale-105 active:scale-95`}
      style={{ transformStyle: "preserve-3d", willChange: "transform" }}
      aria-label="Spin the Vault"
    >
      <div className={`absolute inset-0 rounded-full transition-opacity duration-700 ${spinning ? "opacity-80" : "opacity-40"}`} style={{
        background: "radial-gradient(circle, rgba(120,100,180,0.12) 0%, rgba(80,60,150,0.06) 40%, transparent 70%)",
        filter: "blur(20px)",
        transform: "scale(1.4)",
      }} />
      <div className="absolute inset-0 rounded-full overflow-hidden planet-surface" style={{
        background: `radial-gradient(ellipse at 30% 25%, #2a1f3d 0%, #14102b 30%, #0a0819 60%, #000 100%), linear-gradient(135deg, #1a0f2e 0%, #000 100%)`,
        backgroundBlendMode: "overlay",
        boxShadow: `0 0 60px rgba(80,60,150,0.25), inset 0 -20px 40px rgba(0,0,0,0.9), inset 0 4px 15px rgba(180,160,220,0.08), inset 8px 0 20px rgba(30,20,60,0.6)`,
        border: "1px solid rgba(255,255,255,0.04)",
      }}>
        <div ref={highlightRef} className="absolute inset-0 rounded-full pointer-events-none" />
        <div className="absolute inset-0 rounded-full pointer-events-none" style={{
          background: "linear-gradient(120deg, transparent 40%, rgba(0,0,0,0.5) 75%, rgba(0,0,0,0.85) 100%)",
        }} />
      </div>
      {spinning && (
        <div className="absolute inset-0 rounded-full pointer-events-none planet-burst-ring" style={{
          border: "1px solid rgba(180,160,220,0.3)",
        }} />
      )}
    </button>
  );
}

export default function SpinTheVault({ tracks }: { tracks: Track[] }) {
  const { playTrack, current } = usePlayer();

  const [spinning, setSpinning] = useState(false);
  const [lastTrack, setLastTrack] = useState<Track | null>(null);
  const [taglineIndex] = useState(() => Math.floor(Math.random() * TAGLINES.length));
  const [webglSupported, setWebglSupported] = useState<boolean | null>(null);

  // WebGL detection
  useEffect(() => {
    try {
      const canvas = document.createElement("canvas");
      const gl = canvas.getContext("webgl2") || canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
      setWebglSupported(!!gl);
    } catch {
      setWebglSupported(false);
    }
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
      <div className={noTracks ? "opacity-40 pointer-events-none" : ""}>
        {webglSupported === null ? (
          <div className="w-40 h-40 sm:w-44 sm:h-44" />
        ) : webglSupported ? (
          <Planet3D onSpin={handleSpin} />
        ) : (
          <CssFallbackPlanet spinning={spinning} onTap={handleSpin} />
        )}
      </div>

      <p className="text-[10px] text-dim/40 font-mono lowercase tracking-[0.2em] mt-6 text-center">
        {TAGLINES[taglineIndex]}
      </p>

      {lastTrack && !spinning && (
        <p className="text-[10px] text-accent/30 font-mono mt-2 text-center fade-up">
          now playing · {lastTrack.title}
        </p>
      )}
    </div>
  );
}
