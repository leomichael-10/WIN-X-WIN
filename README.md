# 🎰 Casino Leaderboard

Real-time casino event leaderboard. Players submit money amounts via the player form; the leaderboard auto-refreshes every 1.5 seconds.

## Routes

| Route | Purpose |
|-------|---------|
| `/` | Player form — enter name, upload photo, get challenge, submit money |
| `/leaderboard` | Big-screen display — ranked by money, auto-refreshes |

## Setup

### 1. Supabase

1. Create a Supabase project at [supabase.com](https://supabase.com)
2. Run `supabase/schema.sql` in the SQL Editor (Project → SQL Editor → New query → paste → Run)
3. Create a Storage bucket named **`avatars`** with Public access enabled (Storage → New bucket)

### 2. Environment Variables

Copy `.env.local.example` to `.env.local` and fill in your Supabase credentials:

```bash
cp .env.local.example .env.local
```

Required values (found at Supabase → Project Settings → API):
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_KEY` (service role key — keep secret)

### 3. Local Development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### 4. Deploy to Vercel

1. Push this repo to GitHub
2. Go to [vercel.com](https://vercel.com) → New Project → Import your repo
3. Add environment variables in Vercel project settings:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_KEY`
4. Click Deploy

### 5. Replace Challenges

Replace `public/challenges.json` with your own list. Format:
```json
[
  { "id": 1, "text": "Your challenge text here" }
]
```

Commit and push — Vercel auto-redeploys.

## Tech Stack

- Next.js 15+ (Pages Router)
- Tailwind CSS + shadcn/ui
- Supabase (PostgreSQL + Storage)
- Deployed on Vercel
