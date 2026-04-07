"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import {
  uploadFile, getTracksWithPlayCounts, deleteTrackFull, getSettings, updateSettings, uploadLogo, updateTrackMedia, deleteTrackMedia, updateTrackPrivacy, reorderTracks, toggleSpotlight, updateSpotlightSettings,
  getTotalPlays, getLocationStats, getRecentPlays, getMessages, deleteMessage, getPurchases,
  getProjects, createProject, updateProject, deleteProject, assignTrackToProject,
  type Track, type LocationStat, type Play, type Message, type Purchase, type Project,
} from "@/lib/supabase";

const ADMIN_PW = process.env.NEXT_PUBLIC_ADMIN_PASSWORD || "sandalgod2026";

export default function AdminPage() {
  const [authed, setAuthed] = useState(false);
  const [pw, setPw] = useState("");
  const [pwError, setPwError] = useState(false);

  const [title, setTitle] = useState("");
  const [version, setVersion] = useState("v1");
  const [file, setFile] = useState<File | null>(null);
  const [artworkFile, setArtworkFile] = useState<File | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [lyrics, setLyrics] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [msg, setMsg] = useState<{ text: string; type: "ok" | "err" } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const artRef = useRef<HTMLInputElement>(null);
  const vidRef = useRef<HTMLInputElement>(null);

  const [tracks, setTracks] = useState<Track[]>([]);
  const [loadingTracks, setLoadingTracks] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editArtwork, setEditArtwork] = useState<File | null>(null);
  const [editVideo, setEditVideo] = useState<File | null>(null);
  const [editLyrics, setEditLyrics] = useState("");
  const [editTitle, setEditTitle] = useState("");
  const [editVersion, setEditVersion] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);
  const editArtRef = useRef<HTMLInputElement>(null);
  const editVidRef = useRef<HTMLInputElement>(null);

  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [deletingMsgId, setDeletingMsgId] = useState<string | null>(null);

  // Purchases
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loadingPurchases, setLoadingPurchases] = useState(false);

  // Projects
  const [projectsList, setProjectsList] = useState<Project[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [newProjTitle, setNewProjTitle] = useState("");
  const [newProjSlug, setNewProjSlug] = useState("");
  const [newProjDesc, setNewProjDesc] = useState("");
  const [newProjCover, setNewProjCover] = useState<File | null>(null);
  const [savingProject, setSavingProject] = useState(false);
  const [projMsg, setProjMsg] = useState<{ text: string; type: "ok" | "err" } | null>(null);

  const [siteTitle, setSiteTitle] = useState("THESANDALVAULT");
  const [siteSub, setSiteSub] = useState("ideas, drafts, and loops");
  const [showTracksHome, setShowTracksHome] = useState(true);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsMsg, setSettingsMsg] = useState<{ text: string; type: "ok" | "err" } | null>(null);
  const logoRef = useRef<HTMLInputElement>(null);

  // Spotlight settings
  const [spotTitle, setSpotTitle] = useState("");
  const [spotBio, setSpotBio] = useState("");
  const [spotArtFile, setSpotArtFile] = useState<File | null>(null);
  const [savingSpotlight, setSavingSpotlight] = useState(false);
  const [spotMsg, setSpotMsg] = useState<{ text: string; type: "ok" | "err" } | null>(null);
  const spotArtRef = useRef<HTMLInputElement>(null);

  const [totalPlays, setTotalPlays] = useState(0);
  const [countries, setCountries] = useState<LocationStat[]>([]);
  const [cities, setCities] = useState<LocationStat[]>([]);
  const [recentPlays, setRecentPlays] = useState<(Play & { track_title?: string })[]>([]);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);

  const [tab, setTab] = useState<"upload" | "inbox" | "sales" | "projects" | "analytics" | "settings">("upload");

  const loadTracks = async () => { setLoadingTracks(true); try { setTracks(await getTracksWithPlayCounts()); } catch {} setLoadingTracks(false); };
  const loadSettings = async () => { try { const s = await getSettings(); setSiteTitle(s.title); setSiteSub(s.subtitle); setShowTracksHome(s.show_tracks_on_homepage); setSpotTitle(s.spotlight_title || ""); setSpotBio(s.spotlight_bio || ""); } catch {} };
  const loadAnalytics = async () => {
    setLoadingAnalytics(true);
    try { const [total, locations, recent] = await Promise.all([getTotalPlays(), getLocationStats(), getRecentPlays(30)]); setTotalPlays(total); setCountries(locations.countries); setCities(locations.cities); setRecentPlays(recent); } catch {}
    setLoadingAnalytics(false);
  };
  const loadMessages = async () => { setLoadingMessages(true); try { setMessages(await getMessages()); } catch {} setLoadingMessages(false); };
  const loadPurchases = async () => { setLoadingPurchases(true); try { setPurchases(await getPurchases()); } catch {} setLoadingPurchases(false); };
  const loadProjects = async () => { setLoadingProjects(true); try { setProjectsList(await getProjects()); } catch {} setLoadingProjects(false); };

  useEffect(() => { if (authed) { loadTracks(); loadSettings(); loadAnalytics(); loadMessages(); loadPurchases(); loadProjects(); } }, [authed]);
  useEffect(() => { if (authed && tab === "analytics") loadAnalytics(); if (authed && tab === "inbox") loadMessages(); if (authed && tab === "sales") loadPurchases(); if (authed && tab === "projects") { loadProjects(); loadTracks(); } }, [tab]);

  const handleLogin = (e: React.FormEvent) => { e.preventDefault(); if (pw === ADMIN_PW) { setAuthed(true); } else { setPwError(true); } };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !title.trim()) { setMsg({ text: "Need a title and a file", type: "err" }); return; }
    setUploading(true); setMsg(null);
    try {
      await uploadFile(file, title.trim(), version, artworkFile, videoFile, lyrics || null, isPrivate);
      setMsg({ text: `Uploaded "${title.trim()} (${version})"`, type: "ok" });
      setTitle(""); setVersion("v1"); setFile(null); setArtworkFile(null); setVideoFile(null); setLyrics(""); setIsPrivate(false);
      if (fileRef.current) fileRef.current.value = "";
      if (artRef.current) artRef.current.value = "";
      if (vidRef.current) vidRef.current.value = "";
      loadTracks();
    } catch (err: any) { setMsg({ text: err.message || "Upload failed", type: "err" }); }
    setUploading(false);
  };

  const handleDelete = async (track: Track) => {
    if (!confirm(`Delete "${track.title} (${track.version})"?`)) return;
    setDeletingId(track.id);
    try { await deleteTrackFull(track); setMsg({ text: `Deleted "${track.title}"`, type: "ok" }); loadTracks(); } catch (err: any) { setMsg({ text: err.message, type: "err" }); }
    setDeletingId(null);
  };

  const copyLink = (trackId: string) => { navigator.clipboard.writeText(`${window.location.origin}/track/${trackId}`).then(() => { setCopiedId(trackId); setTimeout(() => setCopiedId(null), 2000); }); };

  const startEdit = (track: Track) => { setEditingId(track.id); setEditTitle(track.title); setEditVersion(track.version); setEditLyrics(track.lyrics || ""); setEditArtwork(null); setEditVideo(null); };

  const handleTogglePrivacy = async (track: Track) => {
    try { await updateTrackPrivacy(track.id, !track.is_private); loadTracks(); } catch (err: any) { setMsg({ text: err.message, type: "err" }); }
  };

  const handleToggleSpotlight = async (track: Track) => {
    try {
      const spotlightCount = tracks.filter((t) => t.is_spotlight).length;
      await toggleSpotlight(track.id, !track.is_spotlight, spotlightCount);
      loadTracks();
    } catch (err: any) { setMsg({ text: err.message, type: "err" }); }
  };

  const moveTrack = async (index: number, dir: number) => {
    const newIndex = index + dir;
    if (newIndex < 0 || newIndex >= tracks.length) return;
    const reordered = [...tracks];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(newIndex, 0, moved);
    setTracks(reordered);
    try { await reorderTracks(reordered.map((t) => t.id)); } catch (err: any) { setMsg({ text: err.message, type: "err" }); loadTracks(); }
  };

  const handleSaveEdit = async (trackId: string) => {
    setSavingEdit(true);
    try { await updateTrackMedia(trackId, editArtwork, editVideo, editLyrics, editTitle.trim() || null, editVersion.trim() || null); setEditingId(null); setMsg({ text: "Track updated", type: "ok" }); loadTracks(); } catch (err: any) { setMsg({ text: err.message, type: "err" }); }
    setSavingEdit(false);
  };

  const handleDeleteMedia = async (trackId: string, field: "artwork_path" | "video_path") => {
    const label = field === "artwork_path" ? "artwork" : "video";
    if (!confirm(`Delete ${label} from this track?`)) return;
    try { await deleteTrackMedia(trackId, field); setMsg({ text: `Deleted ${label}`, type: "ok" }); loadTracks(); } catch (err: any) { setMsg({ text: err.message, type: "err" }); }
  };

  const handleSaveSettings = async () => {
    setSavingSettings(true); setSettingsMsg(null);
    try {
      if (logoFile) { await uploadLogo(logoFile); setLogoFile(null); if (logoRef.current) logoRef.current.value = ""; }
      await updateSettings(siteTitle.trim(), siteSub.trim(), showTracksHome);
      setSettingsMsg({ text: "Settings saved", type: "ok" });
    } catch (err: any) { setSettingsMsg({ text: err.message, type: "err" }); }
    setSavingSettings(false);
  };

  const handleSaveSpotlight = async () => {
    setSavingSpotlight(true); setSpotMsg(null);
    try {
      await updateSpotlightSettings(spotTitle.trim(), spotBio.trim(), spotArtFile);
      if (spotArtFile) { setSpotArtFile(null); if (spotArtRef.current) spotArtRef.current.value = ""; }
      setSpotMsg({ text: "Spotlight saved", type: "ok" });
    } catch (err: any) { setSpotMsg({ text: err.message, type: "err" }); }
    setSavingSpotlight(false);
  };

  if (!authed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-0 px-4">
        <form onSubmit={handleLogin} className="w-full max-w-xs space-y-4">
          <div className="text-center mb-8">
            <div className="w-12 h-12 rounded-full bg-bg-3 flex items-center justify-center mx-auto mb-3">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-muted"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
            </div>
            <h1 className="text-sm font-semibold tracking-wide uppercase">Admin Access</h1>
            <p className="text-[10px] text-muted font-mono mt-1">THESANDALVAULT</p>
          </div>
          <input type="password" value={pw} onChange={(e) => { setPw(e.target.value); setPwError(false); }} placeholder="Password"
            className="w-full px-4 py-3 bg-bg-2 border border-bg-4 rounded-lg text-sm text-accent placeholder:text-dim focus:outline-none focus:border-muted" autoFocus />
          {pwError && <p className="text-xs text-red-400 text-center font-mono">Wrong password</p>}
          <button type="submit" className="w-full py-3 bg-white text-black text-sm font-semibold rounded-lg hover:bg-accent transition-colors">Enter</button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg-0 pb-28">
      <header className="px-6 py-5 flex items-center justify-between border-b border-bg-3">
        <Link href="/" className="active:scale-[0.97] active:opacity-80 transition-all"><h1 className="text-sm font-semibold tracking-wide uppercase">Admin</h1><p className="text-[10px] text-muted font-mono tracking-widest uppercase mt-0.5">thesandalvault</p></Link>
        <Link href="/" className="text-[10px] text-muted font-mono hover:text-accent transition-colors uppercase tracking-wider">← Player</Link>
      </header>

      <div className="flex border-b border-bg-3 overflow-x-auto">
        {(["upload", "inbox", "sales", "projects", "analytics", "settings"] as const).map((t) => (
          <button key={t} onClick={() => { setTab(t); setMsg(null); }}
            className={`flex-1 py-3 text-[10px] font-mono uppercase tracking-widest transition-all whitespace-nowrap px-2 ${tab === t ? "text-accent border-b border-accent" : "text-dim border-b border-transparent"}`}>{t}</button>
        ))}
      </div>

      <div className="max-w-lg mx-auto px-4 py-8">

        {tab === "upload" && (
          <div className="space-y-8">
            <form onSubmit={handleUpload} className="space-y-4">
              <div className="space-y-3">
                <div>
                  <label className="text-[10px] text-muted font-mono uppercase tracking-wider block mb-1.5">Song Title</label>
                  <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="COINCIDENTAL"
                    className="w-full px-4 py-3 bg-bg-2 border border-bg-4 rounded-lg text-sm text-accent placeholder:text-dim focus:outline-none focus:border-muted" />
                </div>
                <div>
                  <label className="text-[10px] text-muted font-mono uppercase tracking-wider block mb-1.5">Version</label>
                  <input type="text" value={version} onChange={(e) => setVersion(e.target.value)} placeholder="v1"
                    className="w-full px-4 py-3 bg-bg-2 border border-bg-4 rounded-lg text-sm text-accent placeholder:text-dim focus:outline-none focus:border-muted font-mono" />
                </div>
                <div>
                  <label className="text-[10px] text-muted font-mono uppercase tracking-wider block mb-1.5">Audio File</label>
                  <input ref={fileRef} type="file" accept="audio/*" onChange={(e) => setFile(e.target.files?.[0] || null)}
                    className="w-full px-4 py-3 bg-bg-2 border border-bg-4 rounded-lg text-sm text-accent file:mr-4 file:py-1 file:px-3 file:rounded file:border-0 file:text-xs file:font-mono file:bg-bg-4 file:text-accent cursor-pointer focus:outline-none" />
                </div>
                <div>
                  <label className="text-[10px] text-muted font-mono uppercase tracking-wider block mb-1.5">Artwork (optional)</label>
                  <input ref={artRef} type="file" accept="image/*" onChange={(e) => setArtworkFile(e.target.files?.[0] || null)}
                    className="w-full px-4 py-3 bg-bg-2 border border-bg-4 rounded-lg text-sm text-accent file:mr-4 file:py-1 file:px-3 file:rounded file:border-0 file:text-xs file:font-mono file:bg-bg-4 file:text-accent cursor-pointer focus:outline-none" />
                </div>
                <div>
                  <label className="text-[10px] text-muted font-mono uppercase tracking-wider block mb-1.5">Video Background (optional)</label>
                  <input ref={vidRef} type="file" accept="video/*" onChange={(e) => setVideoFile(e.target.files?.[0] || null)}
                    className="w-full px-4 py-3 bg-bg-2 border border-bg-4 rounded-lg text-sm text-accent file:mr-4 file:py-1 file:px-3 file:rounded file:border-0 file:text-xs file:font-mono file:bg-bg-4 file:text-accent cursor-pointer focus:outline-none" />
                </div>
                <div>
                  <label className="text-[10px] text-muted font-mono uppercase tracking-wider block mb-1.5">Lyrics (optional)</label>
                  <textarea value={lyrics} onChange={(e) => setLyrics(e.target.value)} placeholder="Write or paste lyrics..."
                    rows={4} className="w-full px-4 py-3 bg-bg-2 border border-bg-4 rounded-lg text-sm text-accent placeholder:text-dim focus:outline-none focus:border-muted resize-y font-mono" />
                </div>
                <div>
                  <button type="button" onClick={() => setIsPrivate(!isPrivate)}
                    className="flex items-center gap-3 w-full px-4 py-3 bg-bg-2 border border-bg-4 rounded-lg transition-colors hover:bg-bg-3">
                    <div className={`w-8 h-[18px] rounded-full transition-colors relative ${isPrivate ? "bg-white" : "bg-bg-4"}`}>
                      <div className={`absolute top-[2px] w-[14px] h-[14px] rounded-full transition-all ${isPrivate ? "right-[2px] bg-black" : "left-[2px] bg-dim"}`} />
                    </div>
                    <div className="text-left">
                      <p className="text-sm text-accent">{isPrivate ? "Private" : "Public"}</p>
                      <p className="text-[9px] text-dim font-mono">{isPrivate ? "only visible in admin" : "visible to everyone"}</p>
                    </div>
                  </button>
                </div>
              </div>
              <button type="submit" disabled={uploading}
                className="w-full py-3 bg-white text-black text-sm font-semibold rounded-lg hover:bg-accent disabled:opacity-40 disabled:cursor-not-allowed transition-all">
                {uploading ? "Uploading..." : "Upload Track"}</button>
              {msg && <p className={`text-xs text-center font-mono ${msg.type === "err" ? "text-red-400" : "text-green-400"}`}>{msg.text}</p>}
            </form>

            <div className="border-t border-bg-3" />

            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-[10px] text-muted font-mono uppercase tracking-widest">Tracks ({tracks.length})</h2>
                <button onClick={loadTracks} className="text-[10px] text-dim font-mono hover:text-accent transition-colors uppercase tracking-wider">Refresh</button>
              </div>
              {loadingTracks ? (
                <p className="text-sm text-muted text-center py-8 font-mono animate-pulse">Loading...</p>
              ) : tracks.length === 0 ? (
                <p className="text-sm text-dim text-center py-8">No tracks uploaded yet</p>
              ) : (
                <div className="space-y-2">
                  {tracks.map((track, idx) => {
                    const isEditing = editingId === track.id;
                    return (
                      <div key={track.id} className="bg-bg-1 rounded-lg overflow-hidden group hover:bg-bg-2 transition-colors">
                        <div className="flex items-center justify-between px-3 py-3">
                          <div className="flex flex-col mr-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => moveTrack(idx, -1)} disabled={idx === 0}
                              className="text-dim hover:text-accent disabled:text-dim/20 transition-colors p-0.5">
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 15l-6-6-6 6" /></svg>
                            </button>
                            <button onClick={() => moveTrack(idx, 1)} disabled={idx === tracks.length - 1}
                              className="text-dim hover:text-accent disabled:text-dim/20 transition-colors p-0.5">
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M6 9l6 6 6-6" /></svg>
                            </button>
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium truncate">{track.title}</p>
                            <p className="text-[10px] text-muted font-mono">
                              {track.version} · {track.play_count || 0} play{(track.play_count || 0) !== 1 ? "s" : ""}
                              {track.artwork_path && " · art"}{track.video_path && " · vid"}{track.lyrics && " · lyrics"}
                              {track.is_private && <span className="text-yellow-500/60"> · private</span>}
                              {track.is_spotlight && <span className="text-orange-400/60"> · spotlight</span>}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 ml-3">
                            <button onClick={() => handleToggleSpotlight(track)}
                              className={`transition-colors ${track.is_spotlight ? "text-orange-400" : "text-dim hover:text-orange-400 opacity-0 group-hover:opacity-100"}`}
                              title={track.is_spotlight ? "Remove from spotlight" : "Add to spotlight"}>
                              <svg width="14" height="14" viewBox="0 0 24 24" fill={track.is_spotlight ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
                                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                              </svg>
                            </button>
                            <button onClick={() => handleTogglePrivacy(track)}
                              className={`transition-colors ${track.is_private ? "text-yellow-500/60" : "text-dim hover:text-accent opacity-0 group-hover:opacity-100"}`}
                              title={track.is_private ? "Make public" : "Make private"}>
                              {track.is_private ? (
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
                              ) : (
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 7-4.7" /></svg>
                              )}
                            </button>
                            <button onClick={() => isEditing ? setEditingId(null) : startEdit(track)}
                              className={`transition-colors ${isEditing ? "text-accent" : "text-dim hover:text-accent opacity-0 group-hover:opacity-100"}`}>
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                            </button>
                            <button onClick={() => copyLink(track.id)} className="text-dim hover:text-accent transition-colors opacity-0 group-hover:opacity-100">
                              {copiedId === track.id ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2"><path d="M5 12l5 5L20 7" /></svg> : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" /></svg>}
                            </button>
                            <button onClick={() => handleDelete(track)} disabled={deletingId === track.id}
                              className="text-dim hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 disabled:opacity-30">
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
                            </button>
                          </div>
                        </div>
                        {isEditing && (
                          <div className="px-3 pb-3 space-y-3 border-t border-bg-3 pt-3">
                            <div>
                              <label className="text-[9px] text-dim font-mono uppercase tracking-wider block mb-1">Title</label>
                              <input type="text" value={editTitle} onChange={(e) => setEditTitle(e.target.value)}
                                className="w-full px-3 py-2 bg-bg-0 border border-bg-4 rounded text-sm text-accent focus:outline-none focus:border-muted" />
                            </div>
                            <div>
                              <label className="text-[9px] text-dim font-mono uppercase tracking-wider block mb-1">Version</label>
                              <input type="text" value={editVersion} onChange={(e) => setEditVersion(e.target.value)}
                                className="w-full px-3 py-2 bg-bg-0 border border-bg-4 rounded text-sm text-accent font-mono focus:outline-none focus:border-muted" />
                            </div>
                            <div>
                              <div className="flex items-center justify-between mb-1">
                                <label className="text-[9px] text-dim font-mono uppercase tracking-wider">Artwork</label>
                                {track.artwork_path && (
                                  <button onClick={() => handleDeleteMedia(track.id, "artwork_path")}
                                    className="text-[9px] text-red-400/60 font-mono hover:text-red-400 transition-colors">Delete</button>
                                )}
                              </div>
                              {track.artwork_path && <p className="text-[9px] text-green-400/50 font-mono mb-1">✓ has artwork</p>}
                              <input ref={editArtRef} type="file" accept="image/*" onChange={(e) => setEditArtwork(e.target.files?.[0] || null)}
                                className="w-full px-3 py-2 bg-bg-0 border border-bg-4 rounded text-xs text-accent file:mr-3 file:py-0.5 file:px-2 file:rounded file:border-0 file:text-[10px] file:font-mono file:bg-bg-4 file:text-accent cursor-pointer focus:outline-none" />
                            </div>
                            <div>
                              <div className="flex items-center justify-between mb-1">
                                <label className="text-[9px] text-dim font-mono uppercase tracking-wider">Video</label>
                                {track.video_path && (
                                  <button onClick={() => handleDeleteMedia(track.id, "video_path")}
                                    className="text-[9px] text-red-400/60 font-mono hover:text-red-400 transition-colors">Delete</button>
                                )}
                              </div>
                              {track.video_path && <p className="text-[9px] text-green-400/50 font-mono mb-1">✓ has video</p>}
                              <input ref={editVidRef} type="file" accept="video/*" onChange={(e) => setEditVideo(e.target.files?.[0] || null)}
                                className="w-full px-3 py-2 bg-bg-0 border border-bg-4 rounded text-xs text-accent file:mr-3 file:py-0.5 file:px-2 file:rounded file:border-0 file:text-[10px] file:font-mono file:bg-bg-4 file:text-accent cursor-pointer focus:outline-none" />
                            </div>
                            <div>
                              <label className="text-[9px] text-dim font-mono uppercase tracking-wider block mb-1">Lyrics</label>
                              <textarea value={editLyrics} onChange={(e) => setEditLyrics(e.target.value)} rows={3}
                                className="w-full px-3 py-2 bg-bg-0 border border-bg-4 rounded text-xs text-accent focus:outline-none resize-y font-mono" />
                            </div>
                            <div className="flex gap-2">
                              <button onClick={() => handleSaveEdit(track.id)} disabled={savingEdit}
                                className="flex-1 py-2 bg-white text-black text-xs font-semibold rounded hover:bg-accent disabled:opacity-40 transition-all">
                                {savingEdit ? "Saving..." : "Save Changes"}</button>
                              <button onClick={() => setEditingId(null)} className="px-4 py-2 text-xs text-dim font-mono hover:text-accent transition-colors">Cancel</button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {tab === "inbox" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-[10px] text-muted font-mono uppercase tracking-widest">{messages.length} note{messages.length !== 1 ? "s" : ""}</h2>
              <button onClick={loadMessages} className="text-[10px] text-dim font-mono hover:text-accent transition-colors uppercase tracking-wider">Refresh</button>
            </div>
            {loadingMessages ? (
              <p className="text-sm text-muted text-center py-12 font-mono animate-pulse">Loading...</p>
            ) : messages.length === 0 ? (
              <p className="text-sm text-dim text-center py-12">No notes yet</p>
            ) : (
              <div className="space-y-2">
                {messages.map((m) => (
                  <div key={m.id} className="px-4 py-3 bg-bg-1 rounded-lg group hover:bg-bg-2 transition-colors">
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-sm text-accent/80 leading-relaxed flex-1 whitespace-pre-wrap">{m.content}</p>
                      <button onClick={async () => { setDeletingMsgId(m.id); try { await deleteMessage(m.id); loadMessages(); } catch {} setDeletingMsgId(null); }}
                        disabled={deletingMsgId === m.id}
                        className="text-dim hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 flex-shrink-0 mt-0.5 disabled:opacity-30">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12" /></svg>
                      </button>
                    </div>
                    <p className="text-[9px] text-dim font-mono mt-2">{new Date(m.created_at).toLocaleDateString()} · {new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ═══ SALES ═══ */}
        {tab === "sales" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-[10px] text-muted font-mono uppercase tracking-widest">{purchases.length} purchase{purchases.length !== 1 ? "s" : ""}</h2>
              <button onClick={loadPurchases} className="text-[10px] text-dim font-mono hover:text-accent transition-colors uppercase tracking-wider">Refresh</button>
            </div>

            {purchases.length > 0 && (
              <div className="bg-bg-2 rounded-lg p-4 text-center mb-4">
                <p className="text-3xl font-semibold">${purchases.reduce((sum, p) => sum + Number(p.amount), 0).toFixed(2)}</p>
                <p className="text-[10px] text-muted font-mono uppercase tracking-widest mt-1">Total Revenue</p>
              </div>
            )}

            {loadingPurchases ? (
              <p className="text-sm text-muted text-center py-12 font-mono animate-pulse">Loading...</p>
            ) : purchases.length === 0 ? (
              <p className="text-sm text-dim text-center py-12">No purchases yet</p>
            ) : (
              <div className="space-y-2">
                {purchases.map((p) => (
                  <div key={p.id} className="px-4 py-3 bg-bg-1 rounded-lg">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-semibold">${Number(p.amount).toFixed(2)}</span>
                      <span className="text-[10px] text-dim font-mono">
                        {new Date(p.created_at).toLocaleDateString()} · {new Date(p.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                    {p.customer_email && (
                      <p className="text-[11px] text-accent/60 font-mono">{p.customer_email}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ═══ PROJECTS ═══ */}
        {tab === "projects" && (
          <div className="space-y-6">
            {/* Create new project */}
            <div className="bg-bg-2 rounded-lg p-4 space-y-3">
              <h3 className="text-[10px] text-muted font-mono uppercase tracking-widest">New Project</h3>
              <input type="text" value={newProjTitle} onChange={(e) => { setNewProjTitle(e.target.value); setNewProjSlug(e.target.value.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "")); }}
                placeholder="Project title" className="w-full px-3 py-2 bg-bg-0 border border-bg-4 rounded text-sm text-accent placeholder:text-dim focus:outline-none focus:border-muted" />
              <input type="text" value={newProjSlug} onChange={(e) => setNewProjSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                placeholder="url-slug" className="w-full px-3 py-2 bg-bg-0 border border-bg-4 rounded text-sm text-accent font-mono placeholder:text-dim focus:outline-none focus:border-muted" />
              <input type="text" value={newProjDesc} onChange={(e) => setNewProjDesc(e.target.value)}
                placeholder="Short description (optional)" className="w-full px-3 py-2 bg-bg-0 border border-bg-4 rounded text-sm text-accent placeholder:text-dim focus:outline-none focus:border-muted" />
              <input type="file" accept="image/*" onChange={(e) => setNewProjCover(e.target.files?.[0] || null)}
                className="w-full px-3 py-2 bg-bg-0 border border-bg-4 rounded text-xs text-accent file:mr-3 file:py-0.5 file:px-2 file:rounded file:border-0 file:text-[10px] file:font-mono file:bg-bg-4 file:text-accent cursor-pointer focus:outline-none" />
              <button
                onClick={async () => {
                  if (!newProjTitle.trim() || !newProjSlug.trim()) return;
                  setSavingProject(true); setProjMsg(null);
                  try {
                    await createProject(newProjTitle.trim(), newProjSlug.trim(), newProjDesc.trim(), newProjCover);
                    setNewProjTitle(""); setNewProjSlug(""); setNewProjDesc(""); setNewProjCover(null);
                    setProjMsg({ text: "Project created", type: "ok" }); loadProjects();
                  } catch (err: any) { setProjMsg({ text: err.message, type: "err" }); }
                  setSavingProject(false);
                }}
                disabled={savingProject || !newProjTitle.trim() || !newProjSlug.trim()}
                className="w-full py-2 bg-white text-black text-xs font-semibold rounded hover:bg-accent disabled:opacity-40 transition-all"
              >{savingProject ? "Creating..." : "Create Project"}</button>
              {projMsg && <p className={`text-xs font-mono ${projMsg.type === "err" ? "text-red-400" : "text-green-400"}`}>{projMsg.text}</p>}
            </div>

            {/* Existing projects */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-[10px] text-muted font-mono uppercase tracking-widest">{projectsList.length} project{projectsList.length !== 1 ? "s" : ""}</h3>
                <button onClick={loadProjects} className="text-[10px] text-dim font-mono hover:text-accent transition-colors uppercase tracking-wider">Refresh</button>
              </div>
              {loadingProjects ? (
                <p className="text-sm text-muted text-center py-8 font-mono animate-pulse">Loading...</p>
              ) : projectsList.length === 0 ? (
                <p className="text-sm text-dim text-center py-8">No projects yet</p>
              ) : (
                <div className="space-y-3">
                  {projectsList.map((proj) => (
                    <div key={proj.id} className="bg-bg-1 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <p className="text-sm font-semibold">{proj.title}</p>
                          <p className="text-[10px] text-dim font-mono">/project/{proj.slug}</p>
                        </div>
                        <button onClick={async () => {
                          if (!confirm(`Delete "${proj.title}"? Tracks will become standalone.`)) return;
                          try { await deleteProject(proj.id); loadProjects(); loadTracks(); } catch {}
                        }} className="text-[10px] text-red-400/60 font-mono hover:text-red-400 transition-colors">Delete</button>
                      </div>
                      {/* Assign tracks */}
                      <p className="text-[9px] text-dim font-mono uppercase tracking-wider mt-3 mb-1">Assign tracks</p>
                      <div className="space-y-1 max-h-48 overflow-y-auto">
                        {tracks.map((track) => {
                          const assigned = track.project_id === proj.id;
                          return (
                            <button key={track.id} onClick={async () => {
                              try { await assignTrackToProject(track.id, assigned ? null : proj.id); loadTracks(); } catch {}
                            }}
                              className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-left text-xs transition-all ${assigned ? "bg-bg-3 text-white" : "text-dim hover:text-accent"}`}>
                              <span className={`w-3 h-3 rounded-sm border flex-shrink-0 flex items-center justify-center ${assigned ? "bg-white border-white" : "border-bg-4"}`}>
                                {assigned && <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="3"><path d="M5 12l5 5L20 7" /></svg>}
                              </span>
                              <span className="truncate">{track.title}</span>
                              {track.project_id && track.project_id !== proj.id && <span className="text-[9px] text-dim font-mono ml-auto">(other)</span>}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {tab === "analytics" && (
          <div className="space-y-6">
            {loadingAnalytics ? (
              <p className="text-sm text-muted text-center py-8 font-mono animate-pulse">Loading analytics...</p>
            ) : (
              <>
                <div className="bg-bg-2 rounded-lg p-4 text-center">
                  <p className="text-3xl font-semibold">{totalPlays}</p>
                  <p className="text-[10px] text-muted font-mono uppercase tracking-widest mt-1">Total Plays</p>
                </div>
                <div>
                  <h3 className="text-[10px] text-muted font-mono uppercase tracking-widest mb-3">Plays per track</h3>
                  <div className="space-y-1">{[...tracks].sort((a, b) => (b.play_count || 0) - (a.play_count || 0)).map((t) => (
                    <div key={t.id} className="flex items-center justify-between px-3 py-2 bg-bg-1 rounded-lg">
                      <span className="text-sm truncate flex-1">{t.title} <span className="text-muted font-mono text-xs">{t.version}</span></span>
                      <span className="text-sm font-mono text-accent ml-3">{t.play_count || 0}</span>
                    </div>
                  ))}</div>
                </div>
                {countries.length > 0 && (<div><h3 className="text-[10px] text-muted font-mono uppercase tracking-widest mb-3">By country</h3><div className="space-y-1">{countries.slice(0, 10).map((c) => (<div key={c.location} className="flex items-center justify-between px-3 py-2 bg-bg-1 rounded-lg"><span className="text-sm">{c.location}</span><span className="text-sm font-mono text-muted">{c.count}</span></div>))}</div></div>)}
                {cities.length > 0 && (<div><h3 className="text-[10px] text-muted font-mono uppercase tracking-widest mb-3">By city</h3><div className="space-y-1">{cities.slice(0, 10).map((c) => (<div key={c.location} className="flex items-center justify-between px-3 py-2 bg-bg-1 rounded-lg"><span className="text-sm">{c.location}</span><span className="text-sm font-mono text-muted">{c.count}</span></div>))}</div></div>)}
                {recentPlays.length > 0 && (<div><h3 className="text-[10px] text-muted font-mono uppercase tracking-widest mb-3">Recent plays</h3><div className="space-y-1">{recentPlays.map((p) => (<div key={p.id} className="flex items-center justify-between px-3 py-2 bg-bg-1 rounded-lg"><div className="min-w-0 flex-1"><span className="text-sm truncate block">{p.track_title}</span><span className="text-[10px] text-dim font-mono">{p.city && p.country ? `${p.city}, ${p.country}` : p.country || "Unknown"}</span></div><span className="text-[10px] text-dim font-mono ml-3 flex-shrink-0">{new Date(p.played_at).toLocaleDateString()} {new Date(p.played_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span></div>))}</div></div>)}
                {totalPlays === 0 && <p className="text-sm text-dim text-center py-4">No plays recorded yet</p>}
                <button onClick={loadAnalytics} className="w-full py-2 text-[10px] text-dim font-mono hover:text-accent transition-colors uppercase tracking-wider text-center">Refresh Analytics</button>
              </>
            )}
          </div>
        )}

        {tab === "settings" && (
          <div className="space-y-4">
            <div><label className="text-[10px] text-muted font-mono uppercase tracking-wider block mb-1.5">Site Title</label><input type="text" value={siteTitle} onChange={(e) => setSiteTitle(e.target.value)} placeholder="THESANDALVAULT" className="w-full px-4 py-3 bg-bg-2 border border-bg-4 rounded-lg text-sm text-accent placeholder:text-dim focus:outline-none focus:border-muted" /></div>
            <div><label className="text-[10px] text-muted font-mono uppercase tracking-wider block mb-1.5">Subtitle / Bio</label><input type="text" value={siteSub} onChange={(e) => setSiteSub(e.target.value)} placeholder="ideas, drafts, and loops" className="w-full px-4 py-3 bg-bg-2 border border-bg-4 rounded-lg text-sm text-accent placeholder:text-dim focus:outline-none focus:border-muted" /></div>
            <div><label className="text-[10px] text-muted font-mono uppercase tracking-wider block mb-1.5">Logo / Profile Picture</label><input ref={logoRef} type="file" accept="image/*" onChange={(e) => setLogoFile(e.target.files?.[0] || null)} className="w-full px-4 py-3 bg-bg-2 border border-bg-4 rounded-lg text-sm text-accent file:mr-4 file:py-1 file:px-3 file:rounded file:border-0 file:text-xs file:font-mono file:bg-bg-4 file:text-accent cursor-pointer focus:outline-none" />{logoFile && <p className="text-[10px] text-muted font-mono mt-1">{logoFile.name}</p>}<p className="text-[10px] text-dim font-mono mt-1">Square image works best (200×200)</p></div>
            <div>
              <button type="button" onClick={() => setShowTracksHome(!showTracksHome)}
                className="flex items-center gap-3 w-full px-4 py-3 bg-bg-2 border border-bg-4 rounded-lg transition-colors hover:bg-bg-3">
                <div className={`w-8 h-[18px] rounded-full transition-colors relative ${showTracksHome ? "bg-white" : "bg-bg-4"}`}>
                  <div className={`absolute top-[2px] w-[14px] h-[14px] rounded-full transition-all ${showTracksHome ? "right-[2px] bg-black" : "left-[2px] bg-dim"}`} />
                </div>
                <div className="text-left">
                  <p className="text-sm text-accent">Show tracks on homepage</p>
                  <p className="text-[9px] text-dim font-mono">{showTracksHome ? "track list visible below EP card" : "only EP card shown, tracks inside playlist page"}</p>
                </div>
              </button>
            </div>
            <button onClick={handleSaveSettings} disabled={savingSettings} className="w-full py-3 bg-white text-black text-sm font-semibold rounded-lg hover:bg-accent disabled:opacity-40 disabled:cursor-not-allowed transition-all mt-2">{savingSettings ? "Saving..." : "Save Settings"}</button>
            {settingsMsg && <p className={`text-xs text-center font-mono ${settingsMsg.type === "err" ? "text-red-400" : "text-green-400"}`}>{settingsMsg.text}</p>}

            <div className="border-t border-bg-3 pt-6 mt-6" />
            <h3 className="text-[10px] text-muted font-mono uppercase tracking-widest">Spotlight Playlist</h3>
            <div>
              <label className="text-[10px] text-muted font-mono uppercase tracking-wider block mb-1.5">Playlist Name</label>
              <input type="text" value={spotTitle} onChange={(e) => setSpotTitle(e.target.value)} placeholder="Spotlight"
                className="w-full px-4 py-3 bg-bg-2 border border-bg-4 rounded-lg text-sm text-accent placeholder:text-dim focus:outline-none focus:border-muted" />
            </div>
            <div>
              <label className="text-[10px] text-muted font-mono uppercase tracking-wider block mb-1.5">Description</label>
              <textarea value={spotBio} onChange={(e) => setSpotBio(e.target.value)} placeholder="Write a short bio or description..."
                rows={3} className="w-full px-4 py-3 bg-bg-2 border border-bg-4 rounded-lg text-sm text-accent placeholder:text-dim focus:outline-none focus:border-muted resize-y font-mono" />
            </div>
            <div>
              <label className="text-[10px] text-muted font-mono uppercase tracking-wider block mb-1.5">Cover Art</label>
              <input ref={spotArtRef} type="file" accept="image/*" onChange={(e) => setSpotArtFile(e.target.files?.[0] || null)}
                className="w-full px-4 py-3 bg-bg-2 border border-bg-4 rounded-lg text-sm text-accent file:mr-4 file:py-1 file:px-3 file:rounded file:border-0 file:text-xs file:font-mono file:bg-bg-4 file:text-accent cursor-pointer focus:outline-none" />
              {spotArtFile && <p className="text-[10px] text-muted font-mono mt-1">{spotArtFile.name}</p>}
              <p className="text-[10px] text-dim font-mono mt-1">Square image works best</p>
            </div>
            <button onClick={handleSaveSpotlight} disabled={savingSpotlight}
              className="w-full py-3 bg-white text-black text-sm font-semibold rounded-lg hover:bg-accent disabled:opacity-40 disabled:cursor-not-allowed transition-all mt-2">
              {savingSpotlight ? "Saving..." : "Save Spotlight"}</button>
            {spotMsg && <p className={`text-xs text-center font-mono ${spotMsg.type === "err" ? "text-red-400" : "text-green-400"}`}>{spotMsg.text}</p>}
          </div>
        )}
      </div>
    </div>
  );
}
