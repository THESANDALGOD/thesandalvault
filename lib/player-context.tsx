"use client";

import { createContext, useContext, useEffect, useState, useRef, useCallback, type ReactNode } from "react";
import { getSignedUrl, recordPlay, type Track } from "@/lib/supabase";

type RepeatMode = "off" | "all" | "one";

interface PlayerState {
  current: Track | null;
  isPlaying: boolean;
  progress: number;
  currentTime: number;
  duration: number;
  volume: number;
  repeatMode: RepeatMode;
  shuffle: boolean;
  expanded: boolean;
  artworkUrl: string | null;
  videoUrl: string | null;
  tracks: Track[];
  setTracks: (t: Track[]) => void;
  playTrack: (track: Track) => void;
  togglePlay: () => void;
  skip: (dir: number) => void;
  seek: (pct: number) => void;
  setVolume: (v: number) => void;
  cycleRepeat: () => void;
  toggleShuffle: () => void;
  setExpanded: (v: boolean) => void;
}

const PlayerContext = createContext<PlayerState | null>(null);

export function usePlayer() {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error("usePlayer must be inside PlayerProvider");
  return ctx;
}

export function PlayerProvider({ children }: { children: ReactNode }) {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [current, setCurrent] = useState<Track | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(0.8);
  const [repeatMode, setRepeatMode] = useState<RepeatMode>("off");
  const [shuffle, setShuffle] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [artworkUrl, setArtworkUrl] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const tracksRef = useRef<Track[]>([]);
  const currentRef = useRef<Track | null>(null);
  const volumeRef = useRef(0.8);
  const repeatRef = useRef<RepeatMode>("off");
  const shuffleRef = useRef(false);

  useEffect(() => { tracksRef.current = tracks; }, [tracks]);
  useEffect(() => { currentRef.current = current; }, [current]);
  useEffect(() => { volumeRef.current = volume; }, [volume]);
  useEffect(() => { repeatRef.current = repeatMode; }, [repeatMode]);
  useEffect(() => { shuffleRef.current = shuffle; }, [shuffle]);

  // Create audio element once
  useEffect(() => {
    const audio = new Audio();
    audioRef.current = audio;
    const onTime = () => {
      setCurrentTime(audio.currentTime);
      setDuration(audio.duration || 0);
      setProgress(audio.duration ? (audio.currentTime / audio.duration) * 100 : 0);
    };
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onEnd = () => {
      if (repeatRef.current === "one") { audio.currentTime = 0; audio.play(); return; }
      const t = tracksRef.current; const c = currentRef.current;
      if (!c || !t.length) return;
      if (shuffleRef.current) {
        const others = t.filter((tr) => tr.id !== c.id);
        if (others.length > 0) playTrackInternal(others[Math.floor(Math.random() * others.length)]);
      } else {
        const idx = t.findIndex((tr) => tr.id === c.id);
        const nextIdx = (idx + 1) % t.length;
        if (nextIdx === 0 && repeatRef.current === "off") { setIsPlaying(false); return; }
        playTrackInternal(t[nextIdx]);
      }
    };
    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("ended", onEnd);
    return () => { audio.removeEventListener("timeupdate", onTime); audio.removeEventListener("play", onPlay); audio.removeEventListener("pause", onPause); audio.removeEventListener("ended", onEnd); audio.pause(); };
  }, []);

  // Load artwork/video URLs when track changes
  useEffect(() => {
    setArtworkUrl(null); setVideoUrl(null);
    if (!current) return;
    if (current.artwork_path) { getSignedUrl(current.artwork_path).then(setArtworkUrl).catch(() => {}); }
    if (current.video_path) { getSignedUrl(current.video_path).then(setVideoUrl).catch(() => {}); }
  }, [current]);

  const playTrackInternal = async (track: Track) => {
    const audio = audioRef.current;
    if (!audio) return;
    try {
      const url = await getSignedUrl(track.file_path);
      audio.src = url;
      audio.volume = volumeRef.current;
      await audio.play();
      setCurrent(track);
      recordPlay(track.id).catch(() => {});
    } catch (err) {
      console.error("Playback error:", err);
    }
  };

  const playTrack = useCallback((track: Track) => { playTrackInternal(track); }, []);

  const togglePlay = useCallback(() => {
    const a = audioRef.current;
    if (a) a.paused ? a.play() : a.pause();
  }, []);

  const skip = useCallback((dir: number) => {
    const t = tracksRef.current; const c = currentRef.current;
    if (!c || !t.length) return;
    if (shuffleRef.current && dir === 1) {
      const others = t.filter((tr) => tr.id !== c.id);
      if (others.length > 0) playTrackInternal(others[Math.floor(Math.random() * others.length)]);
    } else {
      const idx = t.findIndex((tr) => tr.id === c.id);
      playTrackInternal(t[(idx + dir + t.length) % t.length]);
    }
  }, []);

  const seek = useCallback((pct: number) => {
    if (audioRef.current) audioRef.current.currentTime = (pct / 100) * (audioRef.current.duration || 0);
  }, []);

  const setVolume = useCallback((v: number) => {
    setVolumeState(v);
    if (audioRef.current) audioRef.current.volume = v;
  }, []);

  const cycleRepeat = useCallback(() => {
    setRepeatMode((m) => m === "off" ? "all" : m === "all" ? "one" : "off");
  }, []);

  const toggleShuffle = useCallback(() => { setShuffle((s) => !s); }, []);

  return (
    <PlayerContext.Provider value={{
      current, isPlaying, progress, currentTime, duration, volume, repeatMode, shuffle, expanded,
      artworkUrl, videoUrl, tracks, setTracks, playTrack, togglePlay, skip, seek, setVolume,
      cycleRepeat, toggleShuffle, setExpanded,
    }}>
      {children}
    </PlayerContext.Provider>
  );
}
