"use client";

import { useEffect, useState } from "react";
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
  downloads: DownloadTrack[];
}

export default function SuccessPage() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id");

  const [data, setData] = useState<VerifyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionId) { setError("No session found"); setLoading(false); return; }

    fetch("/api/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId }),
    })
      .then((res) => res.json())
      .then((d) => {
        if (d.error) { setError(d.error); } else { setData(d); }
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [sessionId]);

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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-muted text-sm font-mono animate-pulse mb-2">Verifying payment...</div>
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
          <p className="text-sm text-muted font-mono">${data.amount.toFixed(2)} for {data.projectName}</p>
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
