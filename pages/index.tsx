import { useState, useEffect } from 'react'
import Head from 'next/head'
import { useRouter } from 'next/router'
import { Input } from '@/components/ui/input'
import { AvatarUpload } from '@/components/AvatarUpload'

type Mode = 'new' | 'signin'

export default function EntryPage() {
  const router = useRouter()
  const [mode, setMode] = useState<Mode>('new')
  const [username, setUsername] = useState('')
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const trimmed = username.trim()

  useEffect(() => {
    if (localStorage.getItem('casino_player')) router.replace('/game')
  }, [router])

  function switchMode(m: Mode) {
    setMode(m)
    setError(null)
    setUsername('')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!trimmed) { setError('Please enter your name.'); return }
    if (mode === 'new' && trimmed.length > 30) { setError('Name must be 30 characters or fewer.'); return }

    setSubmitting(true)
    try {
      const endpoint = mode === 'new' ? '/api/register' : '/api/signin'
      const body: Record<string, string | null> = { name: trimmed }
      if (mode === 'new') body.avatar_url = avatarUrl

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()

      if (res.status === 409) { setError("That name's taken — pick another."); return }
      if (res.status === 404) { setError("No player found with that name."); return }
      if (!res.ok) { setError(data.error ?? 'Something went wrong.'); return }

      localStorage.setItem('casino_player', JSON.stringify(data))
      router.push('/game')
    } catch {
      setError('Network error — please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const goldGrad = 'linear-gradient(135deg,#ffe066 0%,#d4af37 50%,#a07820 100%)'

  return (
    <>
      <Head><title>Win X Win 🎰</title></Head>

      <div
        className="min-h-screen flex flex-col items-center justify-start px-4 pt-8 pb-12"
        style={{ background: '#0a0a0a' }}
      >
        {/* Arabic header */}
        <p className="text-yellow-500/70 text-xs text-center tracking-wide mb-4 font-medium">
          بسم الثالوث القدوس
        </p>

        {/* Suits row */}
        <div className="flex gap-4 text-2xl mb-4 select-none">
          <span style={{ color: '#c0392b' }}>♥</span>
          <span style={{ color: '#d4af37' }}>♣</span>
          <span style={{ color: '#c0392b' }}>♦</span>
          <span style={{ color: '#d4af37' }}>♠</span>
        </div>

        {/* Badge */}
        <div className="relative flex items-center justify-center mb-2" style={{ width: 280, height: 280 }}>
          <div className="absolute inset-0 rounded-full" style={{ border: '3px solid #d4af37', boxShadow: '0 0 0 6px #0a0a0a,0 0 0 8px #d4af3755,inset 0 0 60px rgba(212,175,55,0.08)' }} />
          <div className="absolute rounded-full" style={{ inset: 14, border: '1.5px solid #d4af3780', borderRadius: '50%' }} />
          <div className="relative z-10 flex flex-col items-center justify-center text-center px-6">
            <div className="flex gap-2 text-sm mb-1 select-none">
              <span style={{ color: '#c0392b' }}>♥</span>
              <span style={{ color: '#d4af37' }}>♣</span>
              <span style={{ color: '#c0392b' }}>♦</span>
              <span style={{ color: '#d4af37' }}>♠</span>
            </div>
            <h1 className="font-black uppercase leading-none" style={{ fontSize: '3.6rem', letterSpacing: '0.12em', background: 'linear-gradient(180deg,#ffe066 0%,#d4af37 40%,#a07820 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', filter: 'drop-shadow(0 2px 8px rgba(212,175,55,0.5))' }}>
              WIN X WIN
            </h1>
            <div className="w-32 h-px my-2" style={{ background: 'linear-gradient(90deg,transparent,#d4af37,transparent)' }} />
            <p className="uppercase font-semibold text-center leading-snug" style={{ fontSize: '0.55rem', letterSpacing: '0.2em', color: '#d4af37' }}>
              Games · Challenges<br />& Surprises
            </p>
          </div>
        </div>

        {/* Date */}
        <div className="flex items-center gap-3 mt-2 mb-1 select-none">
          <div className="h-px w-10" style={{ background: 'linear-gradient(90deg,transparent,#d4af37)' }} />
          <p className="text-yellow-500/80 text-xs font-bold tracking-widest uppercase">Friday 26<sup>th</sup> June 2026</p>
          <div className="h-px w-10" style={{ background: 'linear-gradient(90deg,#d4af37,transparent)' }} />
        </div>
        <p className="text-yellow-700/60 text-xs tracking-widest uppercase mb-6 select-none">Fun · Friends · Memories · Worth Winning</p>

        {/* ── Mode toggle ── */}
        <div className="flex w-full max-w-xs rounded-xl overflow-hidden mb-5" style={{ border: '1.5px solid rgba(212,175,55,0.25)' }}>
          {(['new', 'signin'] as Mode[]).map(m => (
            <button
              key={m}
              type="button"
              onClick={() => switchMode(m)}
              className="flex-1 py-2.5 text-xs font-black uppercase tracking-widest transition-all"
              style={
                mode === m
                  ? { background: goldGrad, color: '#000' }
                  : { background: 'rgba(255,255,255,0.03)', color: 'rgba(212,175,55,0.5)' }
              }
            >
              {m === 'new' ? '✦ New Player' : '→ Sign In'}
            </button>
          ))}
        </div>

        {/* ── Form ── */}
        <form onSubmit={handleSubmit} className="w-full max-w-xs flex flex-col items-center gap-4">

          {/* Avatar — only for new players */}
          {mode === 'new' && (
            <AvatarUpload onUpload={setAvatarUrl} currentUrl={avatarUrl} />
          )}

          <div className="w-full space-y-1">
            <Input
              placeholder={mode === 'new' ? 'Choose a name' : 'Your name'}
              value={username}
              onChange={e => { setUsername(e.target.value); setError(null) }}
              maxLength={30}
              autoFocus
              disabled={submitting}
              className="text-center text-base font-bold h-12 rounded-xl text-white placeholder:text-yellow-900/50"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1.5px solid #d4af3760' }}
            />
            {error && (
              <p className="text-red-400 text-sm text-center font-medium" role="alert">{error}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={submitting || !trimmed}
            className="w-full h-12 rounded-xl font-black text-sm uppercase tracking-widest text-black transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ background: goldGrad, boxShadow: submitting || !trimmed ? 'none' : '0 0 24px rgba(212,175,55,0.4)' }}
          >
            {submitting
              ? (mode === 'new' ? 'Joining…' : 'Signing in…')
              : (mode === 'new' ? 'Join the Game' : 'Sign In')}
          </button>
        </form>
      </div>
    </>
  )
}
