import { useState, useEffect } from 'react'
import Head from 'next/head'
import { useRouter } from 'next/router'
import Image from 'next/image'
import toast, { Toaster } from 'react-hot-toast'
import { ChallengeCard } from '@/components/ChallengeCard'
import { MoneyButtons } from '@/components/MoneyButtons'
import { useChallenges } from '@/hooks/useChallenges'
import type { Player } from '@/lib/types'

export default function GamePage() {
  const router = useRouter()
  const [player, setPlayer] = useState<Player | null>(null)
  const [money, setMoney] = useState<number>(1500)
  const [submitting, setSubmitting] = useState(false)
  const { currentChallenge, completed, loading, skipsLeft, pickNewChallenge, markCompleted } = useChallenges()

  useEffect(() => {
    const stored = localStorage.getItem('casino_player')
    if (!stored) { router.replace('/'); return }
    try {
      const p: Player = JSON.parse(stored)
      setPlayer(p)
      setMoney(p.money)
    } catch { router.replace('/') }
  }, [router])

  async function handleMoneySubmit(amount: number) {
    if (!player) return
    setSubmitting(true)
    try {
      const res = await fetch('/api/players', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: player.name, moneyChange: amount, avatar_url: player.avatar_url }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      markCompleted()
      setMoney(data.money)
      const formatted = amount >= 0 ? `+$${amount}` : `-$${Math.abs(amount)}`
      toast.success(`${formatted} · Total $${data.money}`, {
        icon: amount > 0 ? '🤑' : '💸',
        duration: 3000,
        style: {
          background: '#111',
          color: '#d4af37',
          border: '1px solid #d4af3760',
          fontWeight: 'bold',
        },
      })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setSubmitting(false)
    }
  }

  if (!player) return null

  return (
    <>
      <Head><title>Win X Win 🎰</title></Head>
      <Toaster position="top-center" />

      <div className="min-h-screen flex flex-col px-4 pt-6 pb-10" style={{ background: '#0a0a0a' }}>
        <div className="w-full max-w-md mx-auto flex flex-col gap-5">

          {/* ── Header ── */}
          <div className="flex items-center justify-between">
            {/* Player identity */}
            <div className="flex items-center gap-3">
              <div
                className="relative rounded-full overflow-hidden shrink-0"
                style={{ width: 48, height: 48, border: '2px solid #d4af37', background: '#111' }}
              >
                {player.avatar_url ? (
                  <Image src={player.avatar_url} alt={player.name} fill className="object-cover" unoptimized />
                ) : (
                  <div className="w-full h-full flex items-center justify-center font-black text-xl" style={{ color: '#d4af37' }}>
                    {(player.name?.charAt(0) ?? '?').toUpperCase()}
                  </div>
                )}
              </div>
              <div>
                <p className="text-xs uppercase tracking-widest" style={{ color: 'rgba(212,175,55,0.5)' }}>Playing as</p>
                <p className="font-black text-white text-base leading-tight">{player.name}</p>
                <p
                  className="font-black tabular-nums text-sm leading-tight"
                  style={{ color: money < 0 ? '#e55' : '#d4af37' }}
                >
                  ${money.toLocaleString()}
                </p>
              </div>
            </div>

            {/* Casino wordmark */}
            <h1
              className="font-black uppercase tracking-widest text-2xl"
              style={{
                background: 'linear-gradient(180deg,#ffe066 0%,#d4af37 60%,#a07820 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                filter: 'drop-shadow(0 0 8px rgba(212,175,55,0.4))',
              }}
            >
              WIN X WIN
            </h1>
          </div>

          {/* ── Gold divider ── */}
          <div className="h-px w-full" style={{ background: 'linear-gradient(90deg,transparent,#d4af37,transparent)' }} />

          {/* ── Challenge ── */}
          <ChallengeCard
            text={currentChallenge?.text ?? null}
            completed={completed}
            loading={loading}
            skipsLeft={skipsLeft}
            onGetNew={pickNewChallenge}
          />

          {/* ── Money section ── */}
          <div
            className="rounded-2xl p-5 space-y-3"
            style={{ background: 'rgba(212,175,55,0.04)', border: '1.5px solid rgba(212,175,55,0.15)' }}
          >
            <p className="text-center text-xs font-bold uppercase tracking-[0.25em]" style={{ color: 'rgba(212,175,55,0.6)' }}>
              How did you do?
            </p>
            <MoneyButtons onSubmit={handleMoneySubmit} disabled={submitting} />
          </div>

          {/* ── Footer links ── */}
          <div className="flex items-center justify-center gap-6 pt-1">
            <a
              href="/leaderboard"
              className="text-xs font-bold uppercase tracking-widest transition-colors"
              style={{ color: '#d4af37' }}
            >
              📊 Leaderboard
            </a>
            <span style={{ color: 'rgba(255,255,255,0.1)' }}>|</span>
            <button
              onClick={() => { localStorage.removeItem('casino_player'); router.push('/') }}
              className="text-xs uppercase tracking-widest transition-colors"
              style={{ color: 'rgba(255,255,255,0.25)' }}
            >
              Switch player
            </button>
          </div>

        </div>
      </div>
    </>
  )
}
