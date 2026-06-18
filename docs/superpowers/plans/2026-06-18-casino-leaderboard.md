# Casino Leaderboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a real-time casino event leaderboard with a player submission form and a big-screen display, deployable to Vercel with Supabase persistence and client-side polling for live updates.

**Architecture:** Next.js 15 Pages Router with two user-facing pages (`/` for players, `/leaderboard` for display). API routes handle player upserts and avatar uploads to Supabase Storage. The leaderboard polls `/api/players` every 1.5 seconds for live updates — no WebSocket infra required on Vercel.

**Tech Stack:** Next.js 15, React, TypeScript, Tailwind CSS, shadcn/ui, Supabase (PostgreSQL + Storage), Vercel

---

## File Map

```
casino/
├── pages/
│   ├── index.tsx                   # Player form (challenge + money + avatar)
│   ├── leaderboard.tsx             # Big-screen leaderboard with polling
│   └── api/
│       ├── players.ts              # GET all players / POST upsert player
│       └── upload-avatar.ts        # POST multipart → Supabase Storage
├── components/
│   ├── ChallengeCard.tsx           # Shows challenge text, locked/unlocked state
│   ├── MoneyButtons.tsx            # Preset ±$50/±$100 + custom amount input
│   ├── AvatarUpload.tsx            # Circular image upload with preview
│   ├── LeaderboardRow.tsx          # Single ranked player row
│   └── TotalPoolBanner.tsx         # Sum of all money at top of leaderboard
├── lib/
│   ├── supabase.ts                 # Browser Supabase client
│   ├── supabase-admin.ts           # Server-side service-role client
│   └── types.ts                    # Shared TypeScript interfaces
├── hooks/
│   └── useChallenges.ts            # Fetch challenges.json + localStorage state
├── public/
│   └── challenges.json             # User-supplied challenge list
├── __tests__/
│   ├── api/players.test.ts         # API route unit tests
│   └── api/upload-avatar.test.ts   # Upload route unit tests
├── .env.local                      # Local secrets (gitignored)
├── jest.config.ts
├── jest.setup.ts
├── tailwind.config.ts
└── next.config.ts
```

---

## Task 1: Bootstrap Next.js 15 project with Tailwind + shadcn/ui + Jest

**Files:**
- Create: `package.json`, `next.config.ts`, `tailwind.config.ts`, `tsconfig.json`
- Create: `jest.config.ts`, `jest.setup.ts`
- Create: `styles/globals.css`

- [ ] **Step 1: Scaffold Next.js 15 app**

```bash
cd "C:\Users\miche\OneDrive\Desktop\casino"
npx create-next-app@latest . --typescript --tailwind --eslint --no-app --import-alias "@/*" --yes
```

Expected output: `Success! Created casino at ...`

- [ ] **Step 2: Install Supabase, shadcn/ui deps, and form-data**

```bash
npm install @supabase/supabase-js @supabase/storage-js
npm install react-hot-toast
npm install form-data
npm install -D jest jest-environment-node ts-jest @types/jest
npx shadcn@latest init --yes --base-color slate --css-variables true
npx shadcn@latest add button input card badge
```

- [ ] **Step 3: Configure Jest**

Create `jest.config.ts`:
```ts
import type { Config } from 'jest'

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  setupFilesAfterFramework: ['<rootDir>/jest.setup.ts'],
  testPathPattern: '__tests__',
}

export default config
```

Create `jest.setup.ts`:
```ts
// global test setup — env vars available via process.env in tests
process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost:54321'
process.env.SUPABASE_SERVICE_KEY = 'test-service-key'
```

- [ ] **Step 4: Add test script to package.json**

In `package.json`, under `"scripts"`:
```json
"test": "jest --passWithNoTests",
"test:watch": "jest --watch"
```

- [ ] **Step 5: Verify project starts**

```bash
npm run dev
```

Expected: Next.js dev server running at http://localhost:3000

- [ ] **Step 6: Commit**

```bash
git init
git add .
git commit -m "feat: bootstrap Next.js 15 + Tailwind + shadcn/ui + Jest"
```

---

## Task 2: Supabase types and client setup

**Files:**
- Create: `lib/types.ts`
- Create: `lib/supabase.ts`
- Create: `lib/supabase-admin.ts`
- Create: `.env.local`

- [ ] **Step 1: Create `.env.local`**

```bash
# .env.local (DO NOT commit this file)
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_KEY=your_service_role_key
```

Replace values with your actual Supabase project credentials (found at supabase.com → Project Settings → API).

- [ ] **Step 2: Create shared types**

Create `lib/types.ts`:
```ts
export interface Player {
  id: string
  name: string
  money: number
  avatar_url: string | null
  created_at: string
  updated_at: string
}
```

- [ ] **Step 3: Create browser Supabase client**

Create `lib/supabase.ts`:
```ts
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
```

- [ ] **Step 4: Create server-side admin client**

Create `lib/supabase-admin.ts`:
```ts
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceKey = process.env.SUPABASE_SERVICE_KEY!

export const supabaseAdmin = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false },
})
```

- [ ] **Step 5: Create Supabase table + storage bucket**

Run this SQL in your Supabase project's SQL editor (supabase.com → SQL Editor):
```sql
-- Create players table
create table if not exists players (
  id uuid primary key default gen_random_uuid(),
  name text unique not null,
  money integer not null default 0,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Auto-update updated_at on row change
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger players_updated_at
  before update on players
  for each row execute function update_updated_at();

-- Allow public read (for leaderboard)
alter table players enable row level security;
create policy "Public read" on players for select using (true);
create policy "Public insert" on players for insert with check (true);
create policy "Public update" on players for update using (true);
```

Then in Supabase Dashboard → Storage → New bucket → name: `avatars` → Public: ✅

- [ ] **Step 6: Commit**

```bash
git add lib/ .env.local
git commit -m "feat: Supabase client setup + types"
```

---

## Task 3: GET /api/players route

**Files:**
- Create: `pages/api/players.ts`
- Create: `__tests__/api/players.test.ts`

- [ ] **Step 1: Write failing tests**

Create `__tests__/api/players.test.ts`:
```ts
import { createMocks } from 'node-mocks-http'

// Mock supabase-admin before importing the route
jest.mock('@/lib/supabase-admin', () => ({
  supabaseAdmin: {
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        order: jest.fn(() => Promise.resolve({
          data: [
            { id: '1', name: 'Alice', money: 300, avatar_url: null, created_at: '', updated_at: '' },
            { id: '2', name: 'Bob', money: 100, avatar_url: null, created_at: '', updated_at: '' },
          ],
          error: null,
        })),
      })),
      upsert: jest.fn(() => ({
        select: jest.fn(() => ({
          single: jest.fn(() => Promise.resolve({
            data: { id: '1', name: 'Alice', money: 350, avatar_url: null, created_at: '', updated_at: '' },
            error: null,
          })),
        })),
      })),
    })),
  },
}))

import handler from '@/pages/api/players'

describe('GET /api/players', () => {
  it('returns players sorted by money', async () => {
    const { req, res } = createMocks({ method: 'GET' })
    await handler(req as any, res as any)
    expect(res._getStatusCode()).toBe(200)
    const data = JSON.parse(res._getData())
    expect(data[0].name).toBe('Alice')
    expect(data[0].money).toBe(300)
  })
})

describe('POST /api/players', () => {
  it('upserts player and returns updated player', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      body: { name: 'Alice', moneyChange: 50 },
    })
    await handler(req as any, res as any)
    expect(res._getStatusCode()).toBe(200)
    const data = JSON.parse(res._getData())
    expect(data.name).toBe('Alice')
  })

  it('returns 400 when name is missing', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      body: { moneyChange: 50 },
    })
    await handler(req as any, res as any)
    expect(res._getStatusCode()).toBe(400)
  })
})
```

- [ ] **Step 2: Install node-mocks-http**

```bash
npm install -D node-mocks-http
```

- [ ] **Step 3: Run tests to verify they fail**

```bash
npm test -- --testPathPattern=players
```

Expected: FAIL — `Cannot find module '@/pages/api/players'`

- [ ] **Step 4: Implement GET/POST /api/players**

Create `pages/api/players.ts`:
```ts
import type { NextApiRequest, NextApiResponse } from 'next'
import { supabaseAdmin } from '@/lib/supabase-admin'
import type { Player } from '@/lib/types'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    const { data, error } = await supabaseAdmin
      .from('players')
      .select('*')
      .order('money', { ascending: false })

    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json(data as Player[])
  }

  if (req.method === 'POST') {
    const { name, moneyChange, avatar_url } = req.body

    if (!name || typeof name !== 'string') {
      return res.status(400).json({ error: 'name is required' })
    }
    if (typeof moneyChange !== 'number') {
      return res.status(400).json({ error: 'moneyChange must be a number' })
    }

    // Fetch existing player to calculate new balance
    const { data: existing } = await supabaseAdmin
      .from('players')
      .select('money')
      .eq('name', name.trim())
      .single()

    const currentMoney = existing?.money ?? 0
    const newMoney = currentMoney + moneyChange

    const upsertPayload: Partial<Player> & { name: string; money: number } = {
      name: name.trim(),
      money: newMoney,
    }
    if (avatar_url) upsertPayload.avatar_url = avatar_url

    const { data, error } = await supabaseAdmin
      .from('players')
      .upsert(upsertPayload, { onConflict: 'name' })
      .select()
      .single()

    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json(data as Player)
  }

  res.setHeader('Allow', ['GET', 'POST'])
  return res.status(405).json({ error: 'Method not allowed' })
}
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
npm test -- --testPathPattern=players
```

Expected: PASS (3 tests)

- [ ] **Step 6: Commit**

```bash
git add pages/api/players.ts __tests__/api/players.test.ts
git commit -m "feat: GET/POST /api/players with tests"
```

---

## Task 4: POST /api/upload-avatar route

**Files:**
- Create: `pages/api/upload-avatar.ts`
- Create: `__tests__/api/upload-avatar.test.ts`

- [ ] **Step 1: Install multipart form parser**

```bash
npm install formidable
npm install -D @types/formidable
```

- [ ] **Step 2: Write failing test**

Create `__tests__/api/upload-avatar.test.ts`:
```ts
jest.mock('@/lib/supabase-admin', () => ({
  supabaseAdmin: {
    storage: {
      from: jest.fn(() => ({
        upload: jest.fn(() => Promise.resolve({ data: { path: 'alice.png' }, error: null })),
        getPublicUrl: jest.fn(() => ({ data: { publicUrl: 'https://example.com/avatars/alice.png' } })),
      })),
    },
  },
}))

import { createMocks } from 'node-mocks-http'
import handler from '@/pages/api/upload-avatar'

describe('POST /api/upload-avatar', () => {
  it('returns 405 for GET requests', async () => {
    const { req, res } = createMocks({ method: 'GET' })
    await handler(req as any, res as any)
    expect(res._getStatusCode()).toBe(405)
  })
})
```

- [ ] **Step 3: Run test to confirm it fails**

```bash
npm test -- --testPathPattern=upload-avatar
```

Expected: FAIL — `Cannot find module '@/pages/api/upload-avatar'`

- [ ] **Step 4: Implement upload-avatar route**

Create `pages/api/upload-avatar.ts`:
```ts
import type { NextApiRequest, NextApiResponse } from 'next'
import formidable from 'formidable'
import fs from 'fs'
import path from 'path'
import { supabaseAdmin } from '@/lib/supabase-admin'

export const config = { api: { bodyParser: false } }

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST'])
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const form = formidable({ maxFileSize: 5 * 1024 * 1024 }) // 5MB limit

  const [, files] = await form.parse(req)
  const file = Array.isArray(files.avatar) ? files.avatar[0] : files.avatar

  if (!file) {
    return res.status(400).json({ error: 'No file uploaded' })
  }

  const ext = path.extname(file.originalFilename ?? 'avatar.jpg')
  const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`
  const fileBuffer = fs.readFileSync(file.filepath)

  const { error: uploadError } = await supabaseAdmin.storage
    .from('avatars')
    .upload(filename, fileBuffer, {
      contentType: file.mimetype ?? 'image/jpeg',
      upsert: false,
    })

  if (uploadError) return res.status(500).json({ error: uploadError.message })

  const { data } = supabaseAdmin.storage.from('avatars').getPublicUrl(filename)

  return res.status(200).json({ url: data.publicUrl })
}
```

- [ ] **Step 5: Run test to confirm pass**

```bash
npm test -- --testPathPattern=upload-avatar
```

Expected: PASS (1 test)

- [ ] **Step 6: Commit**

```bash
git add pages/api/upload-avatar.ts __tests__/api/upload-avatar.test.ts
git commit -m "feat: avatar upload route to Supabase Storage"
```

---

## Task 5: useChallenges hook

**Files:**
- Create: `hooks/useChallenges.ts`
- Create: `public/challenges.json` (placeholder — user replaces with real list)

- [ ] **Step 1: Create placeholder challenges.json**

Create `public/challenges.json`:
```json
[
  { "id": 1, "text": "Win 3 hands of Blackjack in a row" },
  { "id": 2, "text": "Hit a single number on Roulette" },
  { "id": 3, "text": "Double down and win at Blackjack" },
  { "id": 4, "text": "Win a hand of Poker with a pair or better" },
  { "id": 5, "text": "Correctly call red or black 3 times in a row" },
  { "id": 6, "text": "Win $200 in a single Craps round" },
  { "id": 7, "text": "Get a Blackjack (Ace + 10-value card)" },
  { "id": 8, "text": "Win at Baccarat on the Banker bet" },
  { "id": 9, "text": "Spin the wheel and land on green (0 or 00)" },
  { "id": 10, "text": "Win 5 consecutive hands at any table game" }
]
```

> **Note to implementer:** The user will replace this file with their own list. The format must stay as `{ id: number, text: string }[]`.

- [ ] **Step 2: Create useChallenges hook**

Create `hooks/useChallenges.ts`:
```ts
import { useState, useEffect } from 'react'

interface Challenge {
  id: number
  text: string
}

const STORAGE_KEY = 'casino_challenge'
const COMPLETED_KEY = 'casino_challenge_completed'

export function useChallenges() {
  const [challenges, setChallenges] = useState<Challenge[]>([])
  const [currentChallenge, setCurrentChallenge] = useState<Challenge | null>(null)
  const [completed, setCompleted] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/challenges.json')
      .then(r => r.json())
      .then((data: Challenge[]) => {
        setChallenges(data)

        // Restore from localStorage
        const stored = localStorage.getItem(STORAGE_KEY)
        const isCompleted = localStorage.getItem(COMPLETED_KEY) === 'true'

        if (stored) {
          const parsed: Challenge = JSON.parse(stored)
          // Make sure the stored challenge still exists in the list
          const stillExists = data.find(c => c.id === parsed.id)
          if (stillExists) {
            setCurrentChallenge(stillExists)
            setCompleted(isCompleted)
            setLoading(false)
            return
          }
        }

        // Pick a random challenge if nothing stored
        const random = data[Math.floor(Math.random() * data.length)]
        setCurrentChallenge(random)
        localStorage.setItem(STORAGE_KEY, JSON.stringify(random))
        localStorage.setItem(COMPLETED_KEY, 'false')
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  function pickNewChallenge() {
    if (!completed || challenges.length === 0) return
    const random = challenges[Math.floor(Math.random() * challenges.length)]
    setCurrentChallenge(random)
    setCompleted(false)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(random))
    localStorage.setItem(COMPLETED_KEY, 'false')
  }

  function markCompleted() {
    setCompleted(true)
    localStorage.setItem(COMPLETED_KEY, 'true')
  }

  return { currentChallenge, completed, loading, pickNewChallenge, markCompleted }
}
```

- [ ] **Step 3: Commit**

```bash
git add hooks/useChallenges.ts public/challenges.json
git commit -m "feat: useChallenges hook with localStorage persistence"
```

---

## Task 6: AvatarUpload component

**Files:**
- Create: `components/AvatarUpload.tsx`

- [ ] **Step 1: Create AvatarUpload component**

Create `components/AvatarUpload.tsx`:
```tsx
import { useRef, useState } from 'react'
import Image from 'next/image'

interface AvatarUploadProps {
  onUpload: (url: string) => void
  currentUrl: string | null
}

export function AvatarUpload({ onUpload, currentUrl }: AvatarUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<string | null>(currentUrl)
  const [uploading, setUploading] = useState(false)

  async function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    // Local preview immediately
    const objectUrl = URL.createObjectURL(file)
    setPreview(objectUrl)
    setUploading(true)

    const formData = new FormData()
    formData.append('avatar', file)

    try {
      const res = await fetch('/api/upload-avatar', { method: 'POST', body: formData })
      const json = await res.json()
      if (json.url) onUpload(json.url)
    } catch {
      // keep preview even if upload failed; will retry on submit
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="relative w-24 h-24 rounded-full overflow-hidden border-4 border-yellow-400 bg-purple-900 flex items-center justify-center cursor-pointer hover:opacity-80 transition-opacity"
      >
        {preview ? (
          <Image src={preview} alt="Avatar" fill className="object-cover" unoptimized />
        ) : (
          <span className="text-4xl">🎰</span>
        )}
        {uploading && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <span className="text-white text-xs">...</span>
          </div>
        )}
      </button>
      <span className="text-xs text-purple-300">Tap to upload photo</span>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleChange}
      />
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add components/AvatarUpload.tsx
git commit -m "feat: AvatarUpload component with live preview"
```

---

## Task 7: ChallengeCard + MoneyButtons components

**Files:**
- Create: `components/ChallengeCard.tsx`
- Create: `components/MoneyButtons.tsx`

- [ ] **Step 1: Create ChallengeCard**

Create `components/ChallengeCard.tsx`:
```tsx
import { Button } from '@/components/ui/button'

interface ChallengeCardProps {
  text: string | null
  completed: boolean
  loading: boolean
  onGetNew: () => void
}

export function ChallengeCard({ text, completed, loading, onGetNew }: ChallengeCardProps) {
  return (
    <div className="bg-gradient-to-br from-purple-900 to-indigo-900 border border-yellow-400/30 rounded-2xl p-6 text-center space-y-4">
      <p className="text-yellow-400 text-xs font-bold uppercase tracking-widest">Your Challenge</p>
      {loading ? (
        <p className="text-white text-lg animate-pulse">Loading challenge...</p>
      ) : (
        <p className="text-white text-xl font-bold leading-snug min-h-[3rem]">{text}</p>
      )}
      <Button
        onClick={onGetNew}
        disabled={!completed}
        variant="outline"
        className={`border-yellow-400 text-yellow-400 hover:bg-yellow-400 hover:text-black transition-all ${
          !completed ? 'opacity-40 cursor-not-allowed' : 'animate-pulse'
        }`}
      >
        {completed ? '🎲 Get New Challenge' : '🔒 Complete challenge first'}
      </Button>
    </div>
  )
}
```

- [ ] **Step 2: Create MoneyButtons**

Create `components/MoneyButtons.tsx`:
```tsx
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface MoneyButtonsProps {
  onSubmit: (amount: number) => void
  disabled: boolean
}

const PRESETS = [
  { label: '+$50', value: 50, color: 'bg-green-600 hover:bg-green-500' },
  { label: '+$100', value: 100, color: 'bg-green-700 hover:bg-green-600' },
  { label: '-$50', value: -50, color: 'bg-red-600 hover:bg-red-500' },
  { label: '-$100', value: -100, color: 'bg-red-700 hover:bg-red-600' },
]

export function MoneyButtons({ onSubmit, disabled }: MoneyButtonsProps) {
  const [custom, setCustom] = useState('')
  const [animating, setAnimating] = useState<number | null>(null)

  function handlePreset(value: number) {
    setAnimating(value)
    setTimeout(() => setAnimating(null), 300)
    onSubmit(value)
  }

  function handleCustom() {
    const parsed = parseInt(custom, 10)
    if (isNaN(parsed) || parsed === 0) return
    onSubmit(parsed)
    setCustom('')
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        {PRESETS.map(({ label, value, color }) => (
          <button
            key={value}
            onClick={() => handlePreset(value)}
            disabled={disabled}
            className={`${color} text-white font-bold text-lg py-4 rounded-xl disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-95 ${
              animating === value ? 'scale-95 brightness-125' : ''
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="flex gap-2">
        <Input
          type="number"
          placeholder="Custom amount (e.g. 75 or -75)"
          value={custom}
          onChange={e => setCustom(e.target.value)}
          disabled={disabled}
          className="bg-purple-900/50 border-purple-600 text-white placeholder:text-purple-400"
          onKeyDown={e => e.key === 'Enter' && handleCustom()}
        />
        <Button
          onClick={handleCustom}
          disabled={disabled || !custom}
          className="bg-yellow-500 hover:bg-yellow-400 text-black font-bold whitespace-nowrap"
        >
          Add Money
        </Button>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add components/ChallengeCard.tsx components/MoneyButtons.tsx
git commit -m "feat: ChallengeCard + MoneyButtons components"
```

---

## Task 8: Player page (/)

**Files:**
- Modify: `pages/index.tsx`

- [ ] **Step 1: Implement the player form page**

Replace `pages/index.tsx` with:
```tsx
import { useState } from 'react'
import Head from 'next/head'
import toast, { Toaster } from 'react-hot-toast'
import { Input } from '@/components/ui/input'
import { AvatarUpload } from '@/components/AvatarUpload'
import { ChallengeCard } from '@/components/ChallengeCard'
import { MoneyButtons } from '@/components/MoneyButtons'
import { useChallenges } from '@/hooks/useChallenges'

export default function PlayerPage() {
  const [name, setName] = useState('')
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const { currentChallenge, completed, loading, pickNewChallenge, markCompleted } = useChallenges()

  async function handleMoneySubmit(amount: number) {
    if (!name.trim()) {
      toast.error('Enter your name first!')
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch('/api/players', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          moneyChange: amount,
          avatar_url: avatarUrl,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      markCompleted()
      const sign = amount > 0 ? '+' : ''
      toast.success(`${sign}$${amount} added! Total: $${data.money}`, {
        icon: amount > 0 ? '🤑' : '💸',
        duration: 3000,
        style: {
          background: '#1e1b4b',
          color: '#fbbf24',
          border: '1px solid #fbbf24',
          fontWeight: 'bold',
        },
      })
    } catch (err: any) {
      toast.error(err.message ?? 'Something went wrong')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <Head>
        <title>Casino Challenge 🎰</title>
      </Head>
      <Toaster position="top-center" />
      <div className="min-h-screen bg-gradient-to-b from-black via-purple-950 to-black px-4 py-8">
        <div className="max-w-md mx-auto space-y-6">
          {/* Header */}
          <div className="text-center">
            <h1 className="text-4xl font-black text-yellow-400 drop-shadow-lg">🎰 Casino Night</h1>
            <p className="text-purple-300 mt-1 text-sm">Complete challenges, earn money!</p>
          </div>

          {/* Avatar + Name */}
          <div className="bg-black/40 border border-purple-700/50 rounded-2xl p-6 space-y-4">
            <AvatarUpload onUpload={setAvatarUrl} currentUrl={avatarUrl} />
            <Input
              placeholder="Your name"
              value={name}
              onChange={e => setName(e.target.value)}
              className="text-center text-lg font-bold bg-purple-900/50 border-purple-600 text-white placeholder:text-purple-400 h-12"
            />
          </div>

          {/* Challenge */}
          <ChallengeCard
            text={currentChallenge?.text ?? null}
            completed={completed}
            loading={loading}
            onGetNew={pickNewChallenge}
          />

          {/* Money buttons */}
          <div className="bg-black/40 border border-purple-700/50 rounded-2xl p-6">
            <p className="text-purple-300 text-sm mb-4 text-center">
              How did you do on this challenge?
            </p>
            <MoneyButtons onSubmit={handleMoneySubmit} disabled={submitting} />
          </div>

          {/* Leaderboard link */}
          <div className="text-center">
            <a
              href="/leaderboard"
              className="text-yellow-400 underline underline-offset-4 text-sm hover:text-yellow-300"
            >
              📊 View Leaderboard →
            </a>
          </div>
        </div>
      </div>
    </>
  )
}
```

- [ ] **Step 2: Verify player page renders**

```bash
npm run dev
```

Open http://localhost:3000 — should show the purple/black card with challenge, avatar upload, name field, and money buttons.

- [ ] **Step 3: Commit**

```bash
git add pages/index.tsx
git commit -m "feat: player form page with challenge + money submission"
```

---

## Task 9: LeaderboardRow + TotalPoolBanner components

**Files:**
- Create: `components/LeaderboardRow.tsx`
- Create: `components/TotalPoolBanner.tsx`

- [ ] **Step 1: Create LeaderboardRow**

Create `components/LeaderboardRow.tsx`:
```tsx
import Image from 'next/image'
import type { Player } from '@/lib/types'

const MEDALS: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' }

interface LeaderboardRowProps {
  player: Player
  rank: number
}

export function LeaderboardRow({ player, rank }: LeaderboardRowProps) {
  const medal = MEDALS[rank] ?? (rank <= 10 ? '🃏' : '🎲')
  const isTop3 = rank <= 3

  return (
    <div
      className={`flex items-center gap-4 px-6 py-4 rounded-2xl transition-all ${
        isTop3
          ? 'bg-gradient-to-r from-yellow-500/20 to-purple-800/40 border border-yellow-400/40'
          : 'bg-black/30 border border-purple-800/30'
      }`}
    >
      {/* Rank */}
      <div className={`text-3xl font-black w-12 text-center ${isTop3 ? 'text-4xl' : ''}`}>
        {medal}
      </div>

      {/* Avatar */}
      <div className="relative w-12 h-12 rounded-full overflow-hidden border-2 border-yellow-400/50 bg-purple-900 shrink-0">
        {player.avatar_url ? (
          <Image src={player.avatar_url} alt={player.name} fill className="object-cover" unoptimized />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-xl font-bold text-yellow-400">
            {player.name.charAt(0).toUpperCase()}
          </div>
        )}
      </div>

      {/* Name */}
      <div className={`flex-1 font-bold truncate ${isTop3 ? 'text-2xl text-white' : 'text-xl text-purple-100'}`}>
        {player.name}
      </div>

      {/* Money */}
      <div
        className={`font-black tabular-nums ${
          isTop3 ? 'text-3xl text-yellow-400' : 'text-2xl text-green-400'
        } ${player.money < 0 ? '!text-red-400' : ''}`}
      >
        {player.money < 0 ? '-' : '+'}${Math.abs(player.money)}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create TotalPoolBanner**

Create `components/TotalPoolBanner.tsx`:
```tsx
interface TotalPoolBannerProps {
  total: number
  playerCount: number
}

export function TotalPoolBanner({ total, playerCount }: TotalPoolBannerProps) {
  return (
    <div className="text-center space-y-1 py-4">
      <p className="text-purple-300 text-sm font-semibold uppercase tracking-widest">Total Pool</p>
      <p className="text-6xl font-black text-yellow-400 drop-shadow-[0_0_20px_rgba(251,191,36,0.5)]">
        ${total.toLocaleString()}
      </p>
      <p className="text-purple-300 text-sm">{playerCount} player{playerCount !== 1 ? 's' : ''}</p>
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add components/LeaderboardRow.tsx components/TotalPoolBanner.tsx
git commit -m "feat: LeaderboardRow + TotalPoolBanner components"
```

---

## Task 10: Leaderboard page (/leaderboard)

**Files:**
- Create: `pages/leaderboard.tsx`

- [ ] **Step 1: Create leaderboard page with polling**

Create `pages/leaderboard.tsx`:
```tsx
import { useState, useEffect, useRef } from 'react'
import Head from 'next/head'
import type { GetServerSideProps } from 'next'
import type { Player } from '@/lib/types'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { LeaderboardRow } from '@/components/LeaderboardRow'
import { TotalPoolBanner } from '@/components/TotalPoolBanner'

interface LeaderboardProps {
  initialPlayers: Player[]
}

export default function LeaderboardPage({ initialPlayers }: LeaderboardProps) {
  const [players, setPlayers] = useState<Player[]>(initialPlayers)
  const prevIdsRef = useRef<string>(JSON.stringify(initialPlayers.map(p => p.money)))

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch('/api/players')
        if (!res.ok) return
        const data: Player[] = await res.json()

        // Only update state if data changed (avoids re-render flicker)
        const newSignature = JSON.stringify(data.map(p => p.money))
        if (newSignature !== prevIdsRef.current) {
          prevIdsRef.current = newSignature
          setPlayers(data)
        }
      } catch {
        // silently ignore network errors — keep showing last known data
      }
    }, 1500)

    return () => clearInterval(interval)
  }, [])

  const total = players.reduce((sum, p) => sum + p.money, 0)

  return (
    <>
      <Head>
        <title>🏆 Casino Leaderboard</title>
      </Head>
      <div className="min-h-screen bg-gradient-to-b from-black via-purple-950 to-black px-4 py-8">
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Header */}
          <div className="text-center">
            <h1 className="text-5xl font-black text-yellow-400 drop-shadow-lg tracking-tight">
              🏆 Leaderboard
            </h1>
            <div className="w-full h-px bg-gradient-to-r from-transparent via-yellow-400/50 to-transparent mt-4" />
          </div>

          {/* Total pool */}
          <TotalPoolBanner total={total} playerCount={players.length} />

          {/* Rankings */}
          {players.length === 0 ? (
            <div className="text-center text-purple-400 text-xl py-16">
              No players yet — be the first! 🎰
            </div>
          ) : (
            <div className="space-y-3">
              {players.map((player, i) => (
                <LeaderboardRow key={player.id} player={player} rank={i + 1} />
              ))}
            </div>
          )}

          {/* Back link */}
          <div className="text-center pt-4">
            <a href="/" className="text-purple-400 text-sm hover:text-purple-300 underline underline-offset-4">
              ← Player Form
            </a>
          </div>
        </div>
      </div>
    </>
  )
}

export const getServerSideProps: GetServerSideProps = async () => {
  const { data } = await supabaseAdmin
    .from('players')
    .select('*')
    .order('money', { ascending: false })

  return {
    props: {
      initialPlayers: data ?? [],
    },
  }
}
```

- [ ] **Step 2: Verify leaderboard renders**

```bash
npm run dev
```

Open http://localhost:3000/leaderboard — shows the big-screen display with total pool and empty state.

- [ ] **Step 3: Commit**

```bash
git add pages/leaderboard.tsx
git commit -m "feat: leaderboard page with SSR initial load + 1.5s polling"
```

---

## Task 11: Global styles and Tailwind theme

**Files:**
- Modify: `tailwind.config.ts`
- Modify: `styles/globals.css`

- [ ] **Step 1: Update Tailwind config with casino color palette**

Replace `tailwind.config.ts`:
```ts
import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: ['class'],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './hooks/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        casino: {
          gold: '#fbbf24',
          purple: '#7c3aed',
          dark: '#0a0010',
        },
      },
      animation: {
        'glow-pulse': 'glow-pulse 2s ease-in-out infinite',
      },
      keyframes: {
        'glow-pulse': {
          '0%, 100%': { textShadow: '0 0 10px #fbbf24, 0 0 20px #fbbf24' },
          '50%': { textShadow: '0 0 20px #fbbf24, 0 0 40px #fbbf24, 0 0 60px #fbbf24' },
        },
      },
    },
  },
  plugins: [],
}

export default config
```

- [ ] **Step 2: Update globals.css**

Replace `styles/globals.css`:
```css
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;900&display=swap');
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  body {
    @apply bg-black text-white antialiased;
    -webkit-tap-highlight-color: transparent;
  }

  * {
    @apply box-border;
  }
}

@layer utilities {
  .text-glow-gold {
    text-shadow: 0 0 10px #fbbf24, 0 0 20px #fbbf24;
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add tailwind.config.ts styles/globals.css
git commit -m "style: casino Tailwind theme + global styles"
```

---

## Task 12: Vercel deployment

**Files:**
- Create: `vercel.json`
- Modify: `next.config.ts`

- [ ] **Step 1: Ensure .env.local is gitignored**

Verify `.gitignore` contains `.env.local`. If not:
```bash
echo ".env.local" >> .gitignore
git add .gitignore
git commit -m "chore: gitignore .env.local"
```

- [ ] **Step 2: Create vercel.json**

Create `vercel.json`:
```json
{
  "framework": "nextjs",
  "buildCommand": "npm run build",
  "devCommand": "npm run dev",
  "installCommand": "npm install"
}
```

- [ ] **Step 3: Push to GitHub**

```bash
git remote add origin https://github.com/YOUR_USERNAME/casino-leaderboard.git
git branch -M main
git push -u origin main
```

- [ ] **Step 4: Deploy to Vercel**

1. Go to vercel.com → New Project → Import your GitHub repo
2. Add these environment variables in Vercel project settings:
   - `NEXT_PUBLIC_SUPABASE_URL` — your Supabase project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` — your Supabase anon key
   - `SUPABASE_SERVICE_KEY` — your Supabase service role key
3. Click **Deploy**

- [ ] **Step 5: Verify deployed app**

- Open the Vercel URL → `/` player form loads
- Open the Vercel URL → `/leaderboard` shows big-screen display
- Submit a money change on player form → leaderboard updates within 1.5 seconds
- Upload a profile picture → avatar appears on leaderboard
- Replace `public/challenges.json` with your real challenges list, push → Vercel auto-redeploys

---

## Verification Checklist

End-to-end test after deployment:

- [ ] Player page loads with a challenge displayed
- [ ] "Get New Challenge" is locked (greyed out) on first visit
- [ ] Entering a name and submitting +$50 → toast appears with new total
- [ ] "Get New Challenge" button unlocks after submission
- [ ] Clicking it shows a new random challenge; button locks again
- [ ] Uploading an avatar → circle shows the photo
- [ ] Opening `/leaderboard` in another tab → player appears within 1.5s
- [ ] Submitting more money → leaderboard rank updates live
- [ ] Negative amounts work (money can go below 0, shown in red)
- [ ] Refreshing player page → same challenge is restored from localStorage
- [ ] `public/challenges.json` can be replaced without redeploying
