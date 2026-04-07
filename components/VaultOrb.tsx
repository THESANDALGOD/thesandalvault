"use client";

import { useState, useRef, useEffect, useCallback } from "react";

export default function VaultOrb() {
  const [question, setQuestion] = useState("");
  const [response, setResponse] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [fading, setFading] = useState(false);
  const cooldownRef = useRef(false);

  // Spam detection
  const tapTimes = useRef<number[]>([]);
  const [spamFace, setSpamFace] = useState<string | null>(null);

  // Rotating placeholders
  const placeholders = ["wassup?", "say something…", "don't be shy", "what you thinking?", "ask me anything…", "type something wild", "go ahead…"];
  const [phIndex, setPhIndex] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setPhIndex((i) => (i + 1) % placeholders.length), 3500);
    return () => clearInterval(id);
  }, []);

  // Auto-clear response after 7s
  useEffect(() => {
    if (!revealed || !response) return;
    const id = setTimeout(() => {
      setFading(true);
      setTimeout(() => { setFading(false); setResponse(null); setRevealed(false); }, 600);
    }, 7000);
    return () => clearTimeout(id);
  }, [revealed, response]);

  // Bounce animation ref
  const [bouncing, setBouncing] = useState(false);

  // 3D rotation refs
  const orbRef = useRef<HTMLDivElement>(null);
  const highlightRef = useRef<HTMLDivElement>(null);
  const currentRotX = useRef(0);
  const currentRotY = useRef(0);
  const targetRotX = useRef(0);
  const targetRotY = useRef(0);
  const rafRef = useRef<number>(0);
  const hasGyro = useRef(false);

  const tick = useCallback(() => {
    currentRotX.current += (targetRotX.current - currentRotX.current) * 0.08;
    currentRotY.current += (targetRotY.current - currentRotY.current) * 0.08;
    if (orbRef.current) {
      orbRef.current.style.transform = `perspective(800px) rotateX(${currentRotX.current}deg) rotateY(${currentRotY.current}deg)`;
    }
    if (highlightRef.current) {
      const hx = 50 + currentRotY.current * 1.5;
      const hy = 30 - currentRotX.current * 1.5;
      highlightRef.current.style.background = `radial-gradient(ellipse at ${hx}% ${hy}%, rgba(255,255,255,0.09) 0%, transparent 60%)`;
    }
    rafRef.current = requestAnimationFrame(tick);
  }, []);

  useEffect(() => {
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [tick]);

  useEffect(() => {
    const onMouse = (e: MouseEvent) => {
      if (hasGyro.current) return;
      const x = (e.clientX / window.innerWidth - 0.5) * 2;
      const y = (e.clientY / window.innerHeight - 0.5) * 2;
      targetRotY.current = x * 12;
      targetRotX.current = -y * 10;
    };
    window.addEventListener("mousemove", onMouse);
    return () => window.removeEventListener("mousemove", onMouse);
  }, []);

  useEffect(() => {
    const onOrient = (e: DeviceOrientationEvent) => {
      if (e.gamma === null || e.beta === null) return;
      hasGyro.current = true;
      targetRotY.current = Math.max(-12, Math.min(12, (e.gamma || 0) * 0.3));
      targetRotX.current = Math.max(-10, Math.min(10, ((e.beta || 0) - 45) * 0.2));
    };
    const requestPermission = async () => {
      const DOE = DeviceOrientationEvent as any;
      if (typeof DOE.requestPermission === "function") {
        try { const p = await DOE.requestPermission(); if (p === "granted") window.addEventListener("deviceorientation", onOrient); } catch {}
      } else { window.addEventListener("deviceorientation", onOrient); }
    };
    const onFirstTap = () => { requestPermission(); window.removeEventListener("touchstart", onFirstTap); };
    window.addEventListener("touchstart", onFirstTap, { once: true });
    return () => { window.removeEventListener("deviceorientation", onOrient); window.removeEventListener("touchstart", onFirstTap); };
  }, []);

  // Haptic + bounce + spam detection
  const handleOrbTap = () => {
    // Haptic
    if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate(10);

    // Bounce
    setBouncing(true);
    setTimeout(() => setBouncing(false), 300);

    // Spam detection
    const now = Date.now();
    tapTimes.current.push(now);
    tapTimes.current = tapTimes.current.filter((t) => now - t < 2000);
    if (tapTimes.current.length > 3) {
      const faces = ["😐", "😑", "🙄"];
      setSpamFace(faces[Math.floor(Math.random() * faces.length)]);
      setTimeout(() => setSpamFace(null), 1500);
      return;
    }

    if (question.trim()) askVault();
  };

  const askVault = async () => {
    if (!question.trim() || loading || cooldownRef.current) return;
    cooldownRef.current = true;
    setTimeout(() => { cooldownRef.current = false; }, 3000);

    const q = question.trim();
    setLoading(true);
    setRevealed(false);
    setResponse(null);
    setQuestion("");

    try {
      const res = await fetch("/api/vault", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q }),
      });
      const data = await res.json();
      setTimeout(() => {
        setResponse(data.response || "...");
        setRevealed(true);
        setLoading(false);
      }, 900);
    } catch {
      setTimeout(() => {
        setResponse("vault tweaking… try again");
        setRevealed(true);
        setLoading(false);
      }, 900);
    }
  };

  // Auto-grow textarea
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 72) + "px";
  }, [question]);

  // Core indicator
  const coreContent = spamFace ? (
    <span className="text-lg select-none">{spamFace}</span>
  ) : loading ? (
    <span className="text-[9px] text-white/20 font-mono vault-core-pulse">···</span>
  ) : null;

  return (
    <div className="flex flex-col items-center">
      {/* ─── THE ORB ─── */}
      <div
        ref={orbRef}
        onClick={handleOrbTap}
        className={`relative w-32 h-32 sm:w-36 sm:h-36 cursor-pointer vault-float ${loading ? "vault-thinking" : ""} ${bouncing ? "vault-bounce" : ""}`}
        style={{ transformStyle: "preserve-3d", willChange: "transform" }}
      >
        <div className={`absolute inset-0 rounded-full transition-opacity duration-700 ${loading ? "opacity-60" : "opacity-30"}`} style={{
          background: "radial-gradient(circle, rgba(255,255,255,0.05) 0%, transparent 70%)",
          filter: "blur(25px)", transform: "scale(1.5)",
        }} />
        <div className="absolute inset-0 rounded-full overflow-hidden vault-liquid" style={{
          background: "radial-gradient(ellipse at 35% 30%, #181818 0%, #0c0c0c 35%, #050505 60%, #000 100%)",
          boxShadow: "0 0 50px rgba(0,0,0,0.9), inset 0 -10px 25px rgba(0,0,0,0.7), inset 0 3px 10px rgba(255,255,255,0.03)",
          border: "1px solid rgba(255,255,255,0.04)",
        }}>
          <div ref={highlightRef} className="absolute inset-0 rounded-full"
            style={{ background: "radial-gradient(ellipse at 50% 30%, rgba(255,255,255,0.09) 0%, transparent 60%)" }} />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center ${loading ? "vault-core-pulse" : ""}`} style={{
              background: "radial-gradient(circle, #0e0e0e 0%, #060606 100%)",
              boxShadow: "inset 0 2px 6px rgba(0,0,0,0.9), 0 0 10px rgba(0,0,0,0.4)",
              border: "1px solid rgba(255,255,255,0.02)",
            }}>
              {coreContent}
            </div>
          </div>
        </div>
      </div>

      <p className="text-[9px] text-dim/30 font-mono uppercase tracking-[0.2em] mt-5 mb-4">Ask the Vault</p>

      {/* Input — auto-growing textarea */}
      <div className="w-full max-w-xs">
        <textarea
          ref={textareaRef}
          value={question}
          onChange={(e) => setQuestion(e.target.value.slice(0, 200))}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); askVault(); } }}
          placeholder={placeholders[phIndex]}
          disabled={loading}
          rows={1}
          className="w-full px-4 py-3 bg-transparent text-sm text-accent/60 placeholder:text-dim/15 focus:outline-none font-mono text-center resize-none overflow-hidden"
          style={{ borderBottom: "1px solid #111", maxHeight: 72 }}
        />
      </div>

      {/* Response */}
      <div className="mt-5 min-h-[48px] flex items-center justify-center px-4">
        {revealed && response && (
          <p className={`text-[13px] text-center text-accent/50 leading-relaxed font-mono max-w-sm ${fading ? "vault-fade-out" : "vault-fade-in"}`}>
            {response}
          </p>
        )}
      </div>
    </div>
  );
}
