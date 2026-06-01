"use client";

import { useState, useEffect } from "react";
import { getPosts, getSignedUrl, type Post } from "@/lib/supabase";

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  const h = Math.floor(m / 60);
  const d = Math.floor(h / 24);
  if (d > 30) return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  if (d > 0) return `${d}d ago`;
  if (h > 0) return `${h}h ago`;
  if (m > 0) return `${m}m ago`;
  return "just now";
}

const TAG_COLORS: Record<string, string> = {
  music:    "rgba(120,100,220,0.25)",
  life:     "rgba(60,160,100,0.25)",
  thoughts: "rgba(200,160,60,0.25)",
  release:  "rgba(220,80,80,0.25)",
  random:   "rgba(80,160,220,0.25)",
};

function tagColor(tag: string) {
  return TAG_COLORS[tag.toLowerCase()] || "rgba(255,255,255,0.08)";
}

function PostCard({ post }: { post: Post & { resolvedImageUrl?: string } }) {
  const hasImage = !!post.resolvedImageUrl;
  const hasText  = !!(post.title || post.body);

  return (
    <article
      className="rounded-2xl overflow-hidden fade-up"
      style={{ background: "#111", border: "1px solid rgba(255,255,255,0.06)" }}
    >
      {/* Image (full-width) */}
      {hasImage && (
        <div className="w-full">
          <img
            src={post.resolvedImageUrl}
            alt={post.title || ""}
            className="w-full object-cover"
            style={{ maxHeight: 480, display: "block" }}
          />
        </div>
      )}

      {/* Text content */}
      {hasText && (
        <div className={`px-6 ${hasImage ? "pt-4 pb-5" : "pt-6 pb-6"}`}>
          {/* Tag/mood pill */}
          {post.tag && (
            <span
              className="inline-block text-[9px] font-mono uppercase tracking-widest px-2.5 py-1 rounded-full mb-3"
              style={{ background: tagColor(post.tag), color: "rgba(255,255,255,0.55)" }}
            >
              {post.tag}
            </span>
          )}

          {/* Title */}
          {post.title && (
            <h3 className="text-base font-semibold leading-snug mb-2 text-accent/90">
              {post.title}
            </h3>
          )}

          {/* Body */}
          {post.body && (
            <p className="text-sm text-muted/60 leading-relaxed whitespace-pre-wrap">
              {post.body}
            </p>
          )}
        </div>
      )}

      {/* Image-only caption placeholder */}
      {hasImage && !hasText && (
        <div className="px-5 py-3">
          {post.tag && (
            <span
              className="inline-block text-[9px] font-mono uppercase tracking-widest px-2.5 py-1 rounded-full"
              style={{ background: tagColor(post.tag), color: "rgba(255,255,255,0.55)" }}
            >
              {post.tag}
            </span>
          )}
        </div>
      )}

      {/* Footer */}
      <div
        className="flex items-center justify-between px-5 py-3"
        style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}
      >
        <span className="text-[9px] text-dim/40 font-mono">THESANDALGOD</span>
        <span className="text-[9px] text-dim/30 font-mono">{timeAgo(post.created_at)}</span>
      </div>
    </article>
  );
}

export default function BlogFeed() {
  const [posts, setPosts] = useState<(Post & { resolvedImageUrl?: string })[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getPosts()
      .then(async (raw) => {
        const resolved = await Promise.all(
          raw.map(async (p) => {
            if (!p.image_path) return p;
            try {
              const url = await getSignedUrl(p.image_path);
              return { ...p, resolvedImageUrl: url };
            } catch { return p; }
          })
        );
        setPosts(resolved);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <span className="text-dim text-xs font-mono animate-pulse">loading posts...</span>
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-2">
        <span className="text-2xl">📭</span>
        <p className="text-dim text-sm font-mono">nothing here yet</p>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto space-y-5 px-4 py-6">
      {posts.map((post) => (
        <PostCard key={post.id} post={post} />
      ))}
    </div>
  );
}
