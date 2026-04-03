# SANDAL STREAM

Private music streaming. Next.js + Supabase. Dark mode.

---

## Quick Start (5 minutes)

### Step 1 — Supabase Project

1. Go to [supabase.com](https://supabase.com) → **New Project**
2. Name: `sandal-stream`, pick region East US
3. Wait ~2 min for it to spin up

### Step 2 — Create Storage Bucket

1. In Supabase dashboard → **Storage** (left sidebar)
2. Click **New Bucket**
3. Name: `tracks`
4. Public: **OFF**
5. File size limit: `50` MB
6. Allowed MIME types: `audio/mpeg, audio/wav, audio/mp4, audio/x-m4a`
7. Click **Create**

### Step 3 — Run SQL Setup

1. In Supabase dashboard → **SQL Editor** (left sidebar)
2. Click **New Query**
3. Paste everything from `supabase-setup.sql`
4. Click **Run**
5. You should see "Success" — no errors

### Step 4 — Get Your Keys

1. Supabase dashboard → **Settings** (gear icon) → **API**
2. Copy **Project URL** — looks like `https://abcdefg.supabase.co`
3. Copy **anon public** key — the long `eyJ...` string

### Step 5 — Set Up Locally

```bash
cd sandal-stream
npm install
```

Create your `.env.local` file:

```bash
cp .env.local.example .env.local
```

Open `.env.local` and paste your keys:

```
NEXT_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT-ID.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
NEXT_PUBLIC_ADMIN_PASSWORD=sandalgod2026
```

### Step 6 — Run It

```bash
npm run dev
```

- Player: http://localhost:3000
- Admin: http://localhost:3000/admin (password: sandalgod2026)

### Step 7 — Upload a Track

1. Go to `localhost:3000/admin`
2. Enter admin password
3. Type song title: `FORGETFUL`
4. Type version: `v8`
5. Pick your MP3
6. Click **Upload Track**
7. Go to `localhost:3000` — it shows up and plays

---

## Deploy to Vercel

```bash
npm i -g vercel
vercel login
vercel
```

Add env vars when prompted (same 3 from .env.local).

Or push to GitHub → import in Vercel dashboard → add env vars there.

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| "relation tracks does not exist" | You didn't run the SQL. Go to SQL Editor → paste `supabase-setup.sql` → Run |
| "Bucket not found" | Create the `tracks` bucket in Storage → New Bucket |
| "new row violates RLS" | Storage policies weren't created. Re-run the SQL (the storage policy section) |
| Upload succeeds but no playback | Check browser console. The signed URL might have CORS issues → Supabase handles this automatically, just refresh |
| "Invalid API key" | Check `.env.local` — make sure there are no extra spaces or quotes around the key |
