"use client";

import { useState, useRef } from "react";

export default function VaultOrb() {
  const [question, setQuestion] = useState("");
  const [response, setResponse] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [wobble, setWobble] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const cooldownRef = useRef(false);

  const askVault = async () => {
    if (!question.trim() || loading || cooldownRef.current) return;
    cooldownRef.current = true;
    setTimeout(() => { cooldownRef.current = false; }, 3000);

    setLoading(true);
    setRevealed(false);
    setResponse(null);
    setWobble(true);

    try {
      const res = await fetch("/api/vault", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: question.trim() }),
      });
      const data = await res.json();

      // Delay reveal for dramatic effect
      setTimeout(() => {
        setWobble(false);
        setResponse(data.response || data.error || "...");
        setRevealed(true);
        setLoading(false);
      }, 800);
    } catch {
      setTimeout(() => {
        setWobble(false);
        setResponse("The vault is elsewhere.");
        setRevealed(true);
        setLoading(false);
      }, 800);
    }
  };

  const handleTap = () => {
    if (question.trim()) askVault();
  };

  return (
    <div className="flex flex-col items-center">
      {/* ─── THE ORB ─── */}
      <button
        onClick={handleTap}
        disabled={loading}
        className={`relative w-32 h-32 sm:w-36 sm:h-36 rounded-full cursor-pointer transition-transform duration-300 ${wobble ? "vault-wobble" : ""} ${!loading ? "hover:scale-105 active:scale-95" : ""}`}
        style={{ perspective: "600px" }}
      >
        {/* Outer glow */}
        <div className="absolute inset-0 rounded-full" style={{
          background: "radial-gradient(circle at 50% 50%, rgba(255,255,255,0.06) 0%, transparent 70%)",
          filter: "blur(20px)",
          transform: "scale(1.3)",
        }} />

        {/* Main orb */}
        <div className="absolute inset-0 rounded-full overflow-hidden" style={{
          background: "radial-gradient(ellipse at 30% 25%, #1a1a1a 0%, #0a0a0a 40%, #000 100%)",
          boxShadow: "0 0 40px rgba(0,0,0,0.8), inset 0 -8px 20px rgba(0,0,0,0.6), inset 0 4px 12px rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.06)",
        }}>
          {/* Glossy highlight */}
          <div className="absolute top-3 left-1/2 -translate-x-1/2 w-16 h-8 rounded-full" style={{
            background: "radial-gradient(ellipse, rgba(255,255,255,0.08) 0%, transparent 70%)",
          }} />

          {/* Inner window */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center" style={{
              background: "radial-gradient(circle, #0d0d0d 0%, #050505 100%)",
              boxShadow: "inset 0 2px 8px rgba(0,0,0,0.8), 0 0 12px rgba(0,0,0,0.5)",
              border: "1px solid rgba(255,255,255,0.03)",
            }}>
              {loading ? (
                <div className="vault-pulse-inner">
                  <span className="text-[10px] text-white/30 font-mono">···</span>
                </div>
              ) : (
                <span className="text-white/50 text-lg font-bold select-none" style={{ fontFamily: "serif" }}>V</span>
              )}
            </div>
          </div>
        </div>
      </button>

      {/* Label */}
      <p className="text-[9px] text-dim/40 font-mono uppercase tracking-[0.2em] mt-4 mb-4">Ask the Vault</p>

      {/* Input */}
      <div className="w-full max-w-xs">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") askVault(); }}
            placeholder="ask the vault…"
            disabled={loading}
            maxLength={200}
            className="flex-1 px-4 py-3 bg-transparent text-sm text-accent/70 placeholder:text-dim/20 focus:outline-none font-mono text-center"
            style={{ borderBottom: "1px solid #151515" }}
          />
        </div>
      </div>

      {/* Response */}
      <div className="mt-5 min-h-[40px] flex items-center justify-center px-4">
        {revealed && response && (
          <p className="text-sm text-center text-accent/60 leading-relaxed font-mono max-w-sm vault-fade-in">
            {response}
          </p>
        )}
      </div>
    </div>
  );
}
