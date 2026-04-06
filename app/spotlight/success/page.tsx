"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

interface DownloadTrack {
  id: string;
  title: string;
  version: string;
  audioUrl: string | null;
  artworkUrl: string | null;
  lyrics: string | null;
}

interface VerifyData {
  success: boolean;
  amount: number;
  projectName: string;
  coverUrl: string | null;
  email: string | null;
  downloads: DownloadTrack[];
}

export default function SuccessPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="text-muted text-sm font-mono animate-pulse">Loading...</div></div>}>
      <SuccessContent />
    </Suspense>
  );
}

function SuccessContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const isFree = searchParams.get("free") === "true";

  const [data, setData] = useState<VerifyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [zipping, setZipping] = useState(false);
  const [zipProgress, setZipProgress] = useState("");
  const [emailSent, setEmailSent] = useState(false);

  useEffect(() => {
    if (!sessionId && !isFree) { setError("No session found"); setLoading(false); return; }

    fetch("/api/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(isFree ? { free: true } : { sessionId }),
    })
      .then((res) => res.json())
      .then((d) => {
        if (d.error) { setError(d.error); return; }
        setData(d);
        // Auto-send download email
        if (d.email && d.downloads?.length) {
          fetch("/api/send-downloads", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              email: d.email,
              projectName: d.projectName,
              downloads: d.downloads,
              coverUrl: d.coverUrl,
            }),
          })
            .then((r) => r.json())
            .then((r) => { if (r.success) setEmailSent(true); })
            .catch(() => {});
        }
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [sessionId, isFree]);

  const downloadLyrics = (track: DownloadTrack) => {
    if (!track.lyrics) return;
    const blob = new Blob([`${track.title}\n${track.version}\n\n${track.lyrics}`], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${track.title} - Lyrics.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadAll = async () => {
    if (!data) return;
    setZipping(true); setZipProgress("Preparing...");
    try {
      const JSZip = (await import("jszip")).default;
      const zip = new JSZip();
      const projectName = data.projectName || "download";

      for (let i = 0; i < data.downloads.length; i++) {
        const track = data.downloads[i];
        setZipProgress(`Downloading ${i + 1}/${data.downloads.length}...`);

        if (track.audioUrl) {
          try {
            const res = await fetch(track.audioUrl);
            const blob = await res.blob();
            const ext = track.audioUrl.includes(".wav") ? "wav" : "mp3";
            zip.file(`${String(i + 1).padStart(2, "0")} - ${track.title}.${ext}`, blob);
          } catch {}
        }

        if (track.lyrics) {
          zip.file(`${String(i + 1).padStart(2, "0")} - ${track.title} (Lyrics).txt`, `${track.title}\n${track.version}\n\n${track.lyrics}`);
        }

        if (track.artworkUrl) {
          try {
            const res = await fetch(track.artworkUrl);
            const blob = await res.blob();
            zip.file(`${String(i + 1).padStart(2, "0")} - ${track.title} (Art).jpg`, blob);
          } catch {}
        }
      }

      // Add cover art
      if (data.coverUrl) {
        try {
          const res = await fetch(data.coverUrl);
          const blob = await res.blob();
          zip.file("Cover.jpg", blob);
        } catch {}
      }

      setZipProgress("Zipping...");
      const content = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(content);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${projectName}.zip`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("ZIP error:", err);
    }
    setZipping(false); setZipProgress("");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-muted text-sm font-mono animate-pulse mb-2">{isFree ? "Preparing downloads..." : "Verifying payment..."}</div>
          <p className="text-[10px] text-dim font-mono">This may take a moment</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center">
          <p className="text-red-400 text-sm font-mono mb-4">{error || "Something went wrong"}</p>
          <Link href="/spotlight" className="text-dim text-xs font-mono hover:text-accent transition-colors">← Back to playlist</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-4 py-8 pb-28">
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-4">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2"><path d="M5 12l5 5L20 7" /></svg>
          </div>
          <h1 className="text-xl font-semibold mb-1">Thank you</h1>
          <p className="text-sm text-muted font-mono">{data.amount > 0 ? `$${data.amount.toFixed(2)} for ${data.projectName}` : data.projectName}</p>
          {emailSent && data.email && (
            <p className="text-[11px] text-green-400/60 font-mono mt-2">Downloads sent to {data.email}</p>
          )}
        </div>

        {/* Cover art */}
        {data.coverUrl && (
          <div className="flex justify-center mb-8">
            <img src={data.coverUrl} alt="" className="w-40 h-40 rounded-xl object-cover shadow-2xl" />
          </div>
        )}

        {/* Downloads */}
        <div className="mb-8">
          <p className="text-[10px] text-dim font-mono uppercase tracking-widest mb-4">Your Downloads</p>

          {/* Download All */}
          <button
            onClick={downloadAll}
            disabled={zipping}
            className="w-full py-3.5 mb-4 bg-white text-black text-sm font-semibold rounded-lg hover:bg-accent disabled:opacity-60 disabled:cursor-wait transition-all flex items-center justify-center gap-2"
          >
            {zipping ? (
              <><span className="animate-pulse">{zipProgress}</span></>
            ) : (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><path d="M7 10l5 5 5-5" /><path d="M12 15V3" /></svg>
                Download All (.zip)
              </>
            )}
          </button>

          <div className="space-y-2">
            {data.downloads.map((track, i) => (
              <div key={track.id} className="bg-bg-1 rounded-lg px-4 py-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{String(i + 1).padStart(2, "0")}. {track.title}</p>
                    <p className="text-[10px] text-dim font-mono">{track.version}</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {track.audioUrl && (
                    <a href={track.audioUrl} download={`${track.title}.mp3`} target="_blank" rel="noopener"
                      className="px-3 py-1.5 bg-white text-black text-[10px] font-semibold rounded hover:bg-accent transition-colors">
                      Download MP3
                    </a>
                  )}
                  {track.lyrics && (
                    <button onClick={() => downloadLyrics(track)}
                      className="px-3 py-1.5 bg-bg-3 text-accent text-[10px] font-mono rounded hover:bg-bg-4 transition-colors">
                      Lyrics .txt
                    </button>
                  )}
                  {track.artworkUrl && (
                    <a href={track.artworkUrl} download={`${track.title} - Art.jpg`} target="_blank" rel="noopener"
                      className="px-3 py-1.5 bg-bg-3 text-accent text-[10px] font-mono rounded hover:bg-bg-4 transition-colors">
                      Artwork
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Back */}
        <div className="text-center">
          <Link href="/spotlight" className="text-[10px] text-dim font-mono hover:text-accent transition-colors uppercase tracking-widest">
            ← Back to playlist
          </Link>
        </div>
      </div>
    </div>
  );
}
