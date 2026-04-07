import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseKey);

// ─── Types ───
export interface Track {
  id: string;
  title: string;
  version: string;
  file_path: string;
  duration: number | null;
  artwork_path: string | null;
  video_path: string | null;
  lyrics: string | null;
  is_private: boolean;
  is_spotlight: boolean;
  spotlight_order: number;
  sort_order: number;
  project_id: string | null;
  created_at: string;
  play_count?: number;
}

export interface Project {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  cover_path: string | null;
  sort_order: number;
  created_at: string;
}

export interface SiteSettings {
  id: string;
  title: string;
  subtitle: string;
  logo_path: string | null;
  spotlight_title: string | null;
  spotlight_bio: string | null;
  spotlight_artwork_path: string | null;
  show_tracks_on_homepage: boolean;
}

export interface Play {
  id: string;
  track_id: string;
  played_at: string;
  country: string | null;
  city: string | null;
}

export interface LocationStat { location: string; count: number; }

// ─── Site Settings ───

export async function getSettings(): Promise<SiteSettings> {
  const { data, error } = await supabase.from("site_settings").select("*").limit(1).single();
  if (error || !data) return { id: "", title: "THESANDALVAULT", subtitle: "ideas, drafts, and loops", logo_path: null, spotlight_title: null, spotlight_bio: null, spotlight_artwork_path: null, show_tracks_on_homepage: true };
  return { ...data, show_tracks_on_homepage: data.show_tracks_on_homepage ?? true };
}

export async function updateSettings(title: string, subtitle: string, showTracksOnHomepage?: boolean): Promise<SiteSettings> {
  const updates: Record<string, unknown> = { title, subtitle };
  if (showTracksOnHomepage !== undefined) updates.show_tracks_on_homepage = showTracksOnHomepage;
  const { data: existing } = await supabase.from("site_settings").select("id").limit(1).single();
  if (existing) {
    const { data, error } = await supabase.from("site_settings").update(updates).eq("id", existing.id).select().single();
    if (error) throw error; return data;
  } else {
    const { data, error } = await supabase.from("site_settings").insert(updates).select().single();
    if (error) throw error; return data;
  }
}

export async function uploadLogo(file: File): Promise<string> {
  const filePath = `logo-${Date.now()}.${file.name.split(".").pop() || "png"}`;
  const { error } = await supabase.storage.from("tracks").upload(filePath, file, { contentType: file.type, upsert: true });
  if (error) throw error;
  const { data: existing } = await supabase.from("site_settings").select("id").limit(1).single();
  if (existing) { await supabase.from("site_settings").update({ logo_path: filePath }).eq("id", existing.id); }
  else { await supabase.from("site_settings").insert({ title: "THESANDALVAULT", subtitle: "ideas, drafts, and loops", logo_path: filePath }); }
  return filePath;
}

export async function getLogoUrl(filePath: string): Promise<string> {
  const { data, error } = await supabase.storage.from("tracks").createSignedUrl(filePath, 86400);
  if (error) throw error; return data.signedUrl;
}

export async function updateSpotlightSettings(title: string, bio: string, artworkFile?: File | null): Promise<void> {
  const updates: Record<string, unknown> = { spotlight_title: title || null, spotlight_bio: bio || null };
  if (artworkFile) {
    const path = `spotlight-${Date.now()}.${artworkFile.name.split(".").pop() || "jpg"}`;
    const { error } = await supabase.storage.from("tracks").upload(path, artworkFile, { contentType: artworkFile.type, upsert: true });
    if (error) throw error;
    updates.spotlight_artwork_path = path;
  }
  const { data: existing } = await supabase.from("site_settings").select("id").limit(1).single();
  if (existing) {
    const { error } = await supabase.from("site_settings").update(updates).eq("id", existing.id);
    if (error) throw error;
  }
}

// ─── Tracks ───

export async function getTracks(): Promise<Track[]> {
  const { data, error } = await supabase.from("tracks").select("*").order("sort_order", { ascending: true }).order("created_at", { ascending: true });
  if (error) throw error; return data ?? [];
}

export async function getPublicTracks(): Promise<Track[]> {
  // Fetch all public tracks, then filter standalone (no project) client-side
  // This avoids .is("project_id", null) which can be unreliable
  const { data, error } = await supabase.from("tracks").select("*").eq("is_private", false).order("sort_order", { ascending: true }).order("created_at", { ascending: false });
  if (error) { console.error("[getPublicTracks] error:", error.message); throw error; }
  const standalone = (data ?? []).filter((t) => !t.project_id);
  console.log("[getPublicTracks] total public:", data?.length, "| standalone:", standalone.length);
  return standalone;
}

// ─── Projects ───

export async function getProjects(): Promise<Project[]> {
  const { data, error } = await supabase.from("projects").select("*").order("sort_order", { ascending: true }).order("created_at", { ascending: false });
  if (error) throw error; return data ?? [];
}

export async function getProjectBySlug(slug: string): Promise<Project | null> {
  const { data, error } = await supabase.from("projects").select("*").eq("slug", slug).single();
  if (error) return null; return data;
}

export async function createProject(title: string, slug: string, description?: string, coverFile?: File | null): Promise<Project> {
  let cover_path: string | null = null;
  if (coverFile) {
    cover_path = `project-${Date.now()}.${coverFile.name.split(".").pop() || "jpg"}`;
    const { error } = await supabase.storage.from("tracks").upload(cover_path, coverFile, { contentType: coverFile.type, upsert: false });
    if (error) throw error;
  }
  const { data, error } = await supabase.from("projects").insert({ title, slug: slug.toLowerCase().replace(/[^a-z0-9-]/g, ""), description: description || null, cover_path }).select().single();
  if (error) throw error; return data;
}

export async function updateProject(id: string, title: string, slug: string, description?: string, coverFile?: File | null): Promise<void> {
  const updates: Record<string, unknown> = { title, slug: slug.toLowerCase().replace(/[^a-z0-9-]/g, ""), description: description || null };
  if (coverFile) {
    const path = `project-${Date.now()}.${coverFile.name.split(".").pop() || "jpg"}`;
    const { error } = await supabase.storage.from("tracks").upload(path, coverFile, { contentType: coverFile.type, upsert: false });
    if (error) throw error;
    updates.cover_path = path;
  }
  const { error } = await supabase.from("projects").update(updates).eq("id", id);
  if (error) throw error;
}

export async function deleteProject(id: string): Promise<void> {
  // Unassign tracks first
  await supabase.from("tracks").update({ project_id: null }).eq("project_id", id);
  const { error } = await supabase.from("projects").delete().eq("id", id);
  if (error) throw error;
}

export async function getProjectTracks(projectId: string): Promise<Track[]> {
  const { data, error } = await supabase.from("tracks").select("*").eq("project_id", projectId).eq("is_private", false).order("sort_order", { ascending: true });
  if (error) { console.error("[getProjectTracks] error:", error.message); throw error; }
  console.log("[getProjectTracks]", projectId, "returned:", data?.length, "tracks");
  return data ?? [];
}

export async function assignTrackToProject(trackId: string, projectId: string | null): Promise<void> {
  console.log("[assignTrackToProject]", trackId, "→ project:", projectId);
  const { error } = await supabase.from("tracks").update({ project_id: projectId }).eq("id", trackId);
  if (error) throw error;
}

export async function getSpotlightTracks(): Promise<Track[]> {
  const { data: tracks, error } = await supabase.from("tracks").select("*").eq("is_spotlight", true).eq("is_private", false).order("spotlight_order", { ascending: true });
  if (error) throw error;
  if (!tracks || !tracks.length) return [];
  const { data: plays } = await supabase.from("plays").select("track_id");
  if (plays) {
    const counts: Record<string, number> = {};
    plays.forEach((p) => { counts[p.track_id] = (counts[p.track_id] || 0) + 1; });
    return tracks.map((t) => ({ ...t, play_count: counts[t.id] || 0 }));
  }
  return tracks.map((t) => ({ ...t, play_count: 0 }));
}

export async function toggleSpotlight(trackId: string, isSpotlight: boolean, spotlightOrder?: number): Promise<void> {
  const updates: Record<string, unknown> = { is_spotlight: isSpotlight };
  if (isSpotlight && spotlightOrder !== undefined) updates.spotlight_order = spotlightOrder;
  if (!isSpotlight) updates.spotlight_order = 0;
  const { error } = await supabase.from("tracks").update(updates).eq("id", trackId);
  if (error) throw error;
}

export async function getTrackById(id: string): Promise<Track | null> {
  const { data, error } = await supabase.from("tracks").select("*").eq("id", id).single();
  if (error) return null; return data;
}

export async function getTracksWithPlayCounts(): Promise<Track[]> {
  const tracks = await getTracks();
  const { data: plays } = await supabase.from("plays").select("track_id");
  if (plays) {
    const counts: Record<string, number> = {};
    plays.forEach((p) => { counts[p.track_id] = (counts[p.track_id] || 0) + 1; });
    return tracks.map((t) => ({ ...t, play_count: counts[t.id] || 0 }));
  }
  return tracks.map((t) => ({ ...t, play_count: 0 }));
}

export async function uploadFile(
  file: File, title: string, version: string,
  artworkFile?: File | null, videoFile?: File | null, lyrics?: string | null, isPrivate?: boolean
): Promise<Track> {
  const ext = file.name.split(".").pop() || "mp3";
  const slug = title.replace(/\s+/g, "-").toLowerCase();
  const filePath = `${Date.now()}-${slug}-${version}.${ext}`;

  const { error: uploadErr } = await supabase.storage.from("tracks").upload(filePath, file, { contentType: file.type, upsert: false });
  if (uploadErr) throw uploadErr;

  let artwork_path: string | null = null;
  if (artworkFile) {
    artwork_path = `art-${Date.now()}-${slug}.${artworkFile.name.split(".").pop() || "jpg"}`;
    const { error: artErr } = await supabase.storage.from("tracks").upload(artwork_path, artworkFile, { contentType: artworkFile.type, upsert: false });
    if (artErr) throw artErr;
  }

  let video_path: string | null = null;
  if (videoFile) {
    video_path = `vid-${Date.now()}-${slug}.${videoFile.name.split(".").pop() || "mp4"}`;
    const { error: vidErr } = await supabase.storage.from("tracks").upload(video_path, videoFile, { contentType: videoFile.type, upsert: false });
    if (vidErr) throw vidErr;
  }

  const duration = await getAudioDuration(file);
  const { data: maxRow } = await supabase.from("tracks").select("sort_order").order("sort_order", { ascending: false }).limit(1).single();
  const nextOrder = (maxRow?.sort_order ?? -1) + 1;
  const { data, error: insertErr } = await supabase.from("tracks").insert({
    title, version, file_path: filePath, duration,
    artwork_path, video_path, lyrics: lyrics || null, is_private: isPrivate || false, sort_order: nextOrder,
  }).select().single();
  if (insertErr) throw insertErr;
  return data;
}

export async function updateTrackMedia(
  trackId: string,
  artworkFile?: File | null, videoFile?: File | null, lyrics?: string | null,
  title?: string | null, version?: string | null
): Promise<void> {
  const updates: Record<string, unknown> = {};

  if (title !== undefined && title !== null) updates.title = title;
  if (version !== undefined && version !== null) updates.version = version;

  if (artworkFile) {
    const path = `art-${Date.now()}.${artworkFile.name.split(".").pop() || "jpg"}`;
    const { error } = await supabase.storage.from("tracks").upload(path, artworkFile, { contentType: artworkFile.type, upsert: false });
    if (error) throw error;
    updates.artwork_path = path;
  }

  if (videoFile) {
    const path = `vid-${Date.now()}.${videoFile.name.split(".").pop() || "mp4"}`;
    const { error } = await supabase.storage.from("tracks").upload(path, videoFile, { contentType: videoFile.type, upsert: false });
    if (error) throw error;
    updates.video_path = path;
  }

  if (lyrics !== undefined) updates.lyrics = lyrics || null;

  if (Object.keys(updates).length > 0) {
    const { error } = await supabase.from("tracks").update(updates).eq("id", trackId);
    if (error) throw error;
  }
}

export async function deleteTrackMedia(trackId: string, field: "artwork_path" | "video_path"): Promise<void> {
  const { data: track } = await supabase.from("tracks").select("*").eq("id", trackId).single();
  if (track && (track as any)[field]) {
    await supabase.storage.from("tracks").remove([(track as any)[field]]);
  }
  const { error } = await supabase.from("tracks").update({ [field]: null }).eq("id", trackId);
  if (error) throw error;
}

export async function updateTrackPrivacy(trackId: string, isPrivate: boolean): Promise<void> {
  console.log("[updateTrackPrivacy]", trackId, "→ private:", isPrivate);
  const { error } = await supabase.from("tracks").update({ is_private: isPrivate }).eq("id", trackId);
  if (error) throw error;
  // When making public, verify project_id state for standalone visibility
  if (!isPrivate) {
    const { data: track } = await supabase.from("tracks").select("project_id").eq("id", trackId).single();
    console.log("[updateTrackPrivacy] after update — project_id:", track?.project_id ?? "null (standalone)");
  }
}

export async function reorderTracks(orderedIds: string[]): Promise<void> {
  for (let i = 0; i < orderedIds.length; i++) {
    const { error } = await supabase.from("tracks").update({ sort_order: i }).eq("id", orderedIds[i]);
    if (error) throw error;
  }
}

export async function deleteTrackFull(track: Track) {
  await supabase.from("plays").delete().eq("track_id", track.id);
  const filesToRemove = [track.file_path];
  if (track.artwork_path) filesToRemove.push(track.artwork_path);
  if (track.video_path) filesToRemove.push(track.video_path);
  await supabase.storage.from("tracks").remove(filesToRemove);
  const { error } = await supabase.from("tracks").delete().eq("id", track.id);
  if (error) throw error;
}

export async function getSignedUrl(filePath: string): Promise<string> {
  const { data, error } = await supabase.storage.from("tracks").createSignedUrl(filePath, 3600);
  if (error) throw error; return data.signedUrl;
}

// ─── Play Tracking ───

async function getLocation(): Promise<{ country: string | null; city: string | null }> {
  try {
    const res = await fetch("https://ipapi.co/json/", { signal: AbortSignal.timeout(3000) });
    if (!res.ok) return { country: null, city: null };
    const data = await res.json();
    return { country: data.country_name || null, city: data.city || null };
  } catch { return { country: null, city: null }; }
}

export async function recordPlay(trackId: string): Promise<void> {
  const loc = await getLocation();
  await supabase.from("plays").insert({ track_id: trackId, country: loc.country, city: loc.city });
}

export async function getTotalPlays(): Promise<number> {
  const { count, error } = await supabase.from("plays").select("*", { count: "exact", head: true });
  if (error) return 0; return count || 0;
}

export async function getLocationStats(): Promise<{ countries: LocationStat[]; cities: LocationStat[] }> {
  const { data: plays } = await supabase.from("plays").select("country, city");
  if (!plays) return { countries: [], cities: [] };
  const cc: Record<string, number> = {};
  const ci: Record<string, number> = {};
  plays.forEach((p) => { if (p.country) cc[p.country] = (cc[p.country] || 0) + 1; if (p.city) ci[p.city] = (ci[p.city] || 0) + 1; });
  return {
    countries: Object.entries(cc).map(([location, count]) => ({ location, count })).sort((a, b) => b.count - a.count),
    cities: Object.entries(ci).map(([location, count]) => ({ location, count })).sort((a, b) => b.count - a.count),
  };
}

export async function getRecentPlays(limit = 20): Promise<(Play & { track_title?: string })[]> {
  const { data: plays } = await supabase.from("plays").select("*").order("played_at", { ascending: false }).limit(limit);
  if (!plays) return [];
  const trackIds = Array.from(new Set(plays.map((p) => p.track_id)));
  const { data: tracks } = await supabase.from("tracks").select("id, title").in("id", trackIds);
  const titleMap: Record<string, string> = {};
  tracks?.forEach((t) => { titleMap[t.id] = t.title; });
  return plays.map((p) => ({ ...p, track_title: titleMap[p.track_id] || "Unknown" }));
}

// ─── Purchases ───

export interface Purchase {
  id: string;
  stripe_session_id: string;
  amount: number;
  currency: string;
  customer_email: string | null;
  created_at: string;
}

export async function getPurchases(): Promise<Purchase[]> {
  const { data, error } = await supabase.from("purchases").select("*").order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

// ─── Helpers ───

function getAudioDuration(file: File): Promise<number | null> {
  return new Promise((resolve) => {
    const audio = new Audio();
    audio.addEventListener("loadedmetadata", () => { resolve(Math.round(audio.duration)); URL.revokeObjectURL(audio.src); });
    audio.addEventListener("error", () => { resolve(null); URL.revokeObjectURL(audio.src); });
    audio.src = URL.createObjectURL(file);
  });
}

// ─── Messages ───

export interface Message {
  id: string;
  content: string;
  created_at: string;
}

export async function sendMessage(content: string): Promise<void> {
  const trimmed = content.trim().slice(0, 250);
  if (!trimmed) throw new Error("Message is empty");
  const { error } = await supabase.from("messages").insert({ content: trimmed });
  if (error) throw error;
}

export async function getMessages(): Promise<Message[]> {
  const { data, error } = await supabase.from("messages").select("*").order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function deleteMessage(id: string): Promise<void> {
  const { error } = await supabase.from("messages").delete().eq("id", id);
  if (error) throw error;
}
