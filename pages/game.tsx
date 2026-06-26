import { useState, useEffect } from 'react'
import Head from 'next/head'
import { useRouter } from 'next/router'
import toast, { Toaster } from 'react-hot-toast'
import { ChallengeCard } from '@/components/ChallengeCard'
import { MoneyButtons } from '@/components/MoneyButtons'
import { useChallenges } from '@/hooks/useChallenges'
import type { Player } from '@/lib/types'

export default function GamePage() {
  const router = useRouter()
  const [player, setPlayer] = useState<Player | null>(null)
  const [money, setMoney]   = useState<number | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const {
    currentChallenge, loading, skipsLeft, resetCountdown,
    dealerStatus, confirmedReward,
    submitToDealer, skipChallenge, markCompleted,
  } = useChallenges()

  useEffect(() => {
    const stored = localStorage.getItem('casino_player')
    if (!stored) { router.replace('/'); return }
    try {
      const p: Player = JSON.parse(stored)
      setPlayer(p)
      setMoney(p.money) // temporary display while we fetch fresh value
      // Hydrate money from Supabase — localStorage may be stale after mutations
      fetch('/api/players')
        .then(r => r.json())
        .then((players: Player[]) => {
          const fresh = players.find(pl => pl.id === p.id)
          if (fresh) setMoney(fresh.money)
        })
        .catch(() => {/* keep localStorage value on network failure */})
    } catch { router.replace('/') }
  }, [router])

  // When dealer confirms, re-fetch from DB to get the authoritative post-confirmation total
  useEffect(() => {
    if (dealerStatus === 'confirmed' && confirmedReward > 0) {
      fetch('/api/players')
        .then(r => r.json())
        .then((players: Player[]) => {
          const fresh = players.find(pl => pl.id === player?.id)
          if (fresh) {
            setMoney(fresh.money)
            localStorage.setItem('casino_player', JSON.stringify({ ...player, money: fresh.money }))
          }
        })
        .catch(() => {
          // Supabase re-fetch failed; apply delta locally and keep localStorage in sync
          // so the next refresh isn't stale. The DB already has the correct value (confirm.ts
          // wrote it before we got here) — it will reconcile on the next successful fetch.
          setMoney(prev => {
            const optimistic = (prev ?? 0) + confirmedReward
            localStorage.setItem('casino_player', JSON.stringify({ ...player, money: optimistic }))
            return optimistic
          })
        })
    }
  }, [dealerStatus, confirmedReward, player])

  async function handleMoneySubmit(amount: number) {
    if (!player) return
    setSubmitting(true)
    try {
      // Idempotency key: ties this reward to one player + one challenge + one amount.
      // A double-tap of the same button for the same challenge reuses the key →
      // apply_reward inserts only ONE transaction row.
      const challengeId = currentChallenge?.id ?? 'manual'
      const idempotencyKey = `${player.id}-${challengeId}-${amount}`

      const res = await fetch('/api/players', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          player_id: player.id,
          amount,
          reason: String(challengeId),
          idempotency_key: idempotencyKey,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      markCompleted()
      // data.money is the authoritative total returned by apply_reward — never client-computed
      setMoney(data.money)
      // Keep localStorage in sync so it isn't stale on next mount
      localStorage.setItem('casino_player', JSON.stringify({ ...player, money: data.money }))
      const formatted = amount >= 0 ? `+$${amount}` : `-$${Math.abs(amount)}`
      toast.success(`${formatted} · Total $${data.money}`, {
        icon: amount > 0 ? '🤑' : '💸',
        duration: 3000,
        style: { background: '#111', color: '#d4af37', border: '1px solid #d4af3760', fontWeight: 'bold' },
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
            <div className="flex items-center gap-3">
              <div className="relative rounded-full overflow-hidden shrink-0"
                style={{ width: 48, height: 48, border: '2px solid #d4af37', background: '#111' }}>
                {player.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={player.avatar_url} alt={player.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center font-black text-xl" style={{ color: '#d4af37' }}>
                    {(player.name?.charAt(0) ?? '?').toUpperCase()}
                  </div>
                )}
              </div>
              <div>
                <p className="text-xs uppercase tracking-widest leading-tight" style={{ color: 'rgba(212,175,55,0.45)' }}>Playing as</p>
                <p className="font-black text-white text-base leading-tight">{player.name}</p>
                <div className="flex items-center gap-1.5 mt-1">
                  <span className="text-xs uppercase tracking-widest" style={{ color: 'rgba(212,175,55,0.45)' }}>🏦 WWB</span>
                  <span className="font-black tabular-nums text-base leading-tight"
                    style={{ color: (money ?? 0) < 0 ? '#f87171' : '#d4af37', textShadow: (money ?? 0) >= 0 ? '0 0 10px rgba(212,175,55,0.4)' : 'none' }}>
                    {money === null ? '—' : `$${money.toLocaleString()}`}
                  </span>
                </div>
              </div>
            </div>

            <h1 className="font-black uppercase tracking-widest text-2xl"
              style={{
                background: 'linear-gradient(180deg,#ffe066 0%,#d4af37 60%,#a07820 100%)',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
                filter: 'drop-shadow(0 0 8px rgba(212,175,55,0.4))',
              }}>
              WIN X WIN
            </h1>
          </div>

          {/* ── Gold divider ── */}
          <div className="h-px w-full" style={{ background: 'linear-gradient(90deg,transparent,#d4af37,transparent)' }} />

          {/* ── Challenge (dealer-gated) ── */}
          <ChallengeCard
            text={currentChallenge?.text ?? null}
            loading={loading}
            skipsLeft={skipsLeft}
            resetCountdown={resetCountdown}
            dealerStatus={dealerStatus}
            confirmedReward={confirmedReward}
            onSubmitToDealer={() => submitToDealer(player.name, player.avatar_url)}
            onSkip={skipChallenge}
          />

          {/* ── WWB Bank ── */}
          <div className="rounded-2xl p-5 space-y-3"
            style={{ background: 'rgba(212,175,55,0.04)', border: '1.5px solid rgba(212,175,55,0.3)' }}>
            <div className="flex items-center gap-2 justify-center">
              <div className="h-px flex-1" style={{ background: 'linear-gradient(90deg,transparent,rgba(212,175,55,0.4))' }} />
              <p className="text-xs font-black uppercase tracking-[0.25em]" style={{ color: '#d4af37' }}>🏦 WWB Bank</p>
              <div className="h-px flex-1" style={{ background: 'linear-gradient(90deg,rgba(212,175,55,0.4),transparent)' }} />
            </div>
            <MoneyButtons onSubmit={handleMoneySubmit} disabled={submitting} />
          </div>

          {/* ── Footer ── */}
          <div className="flex items-center justify-center pt-1">
            <a href="/leaderboard" className="text-xs font-bold uppercase tracking-widest" style={{ color: '#d4af37' }}>
              📊 Leaderboard
            </a>
          </div>

        </div>
      </div>
    </>
  )
}
