import { useState, useEffect, useRef } from 'react'
import Head from 'next/head'
import type { GetServerSideProps } from 'next'
import type { Player } from '@/lib/types'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { LeaderboardRow } from '@/components/LeaderboardRow'

interface LeaderboardProps {
  initialPlayers: Player[]
}

export default function LeaderboardPage({ initialPlayers }: LeaderboardProps) {
  const [players, setPlayers] = useState<Player[]>(initialPlayers)
  const prevSignatureRef = useRef<string>(
    JSON.stringify(initialPlayers.map(p => `${p.id}:${p.money}:${p.name}`))
  )

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch('/api/players')
        if (!res.ok) return
        const data: Player[] = await res.json()
        const sig = JSON.stringify(data.map(p => `${p.id}:${p.money}:${p.name}`))
        if (sig !== prevSignatureRef.current) {
          prevSignatureRef.current = sig
          setPlayers(data)
        }
      } catch { /* keep last known data */ }
    }, 1500)
    return () => clearInterval(interval)
  }, [])

  const total = players.reduce((sum, p) => sum + p.money, 0)

  return (
    <>
      <Head><title>🏆 Win X Win Leaderboard</title></Head>

      <div className="min-h-screen flex flex-col px-4 pt-8 pb-12" style={{ background: '#0a0a0a' }}>
        <div className="w-full max-w-2xl mx-auto flex flex-col gap-6">

          {/* ── Header badge ── */}
          <div className="text-center space-y-1">
            <div className="flex items-center justify-center gap-3 select-none">
              <div className="h-px w-16" style={{ background: 'linear-gradient(90deg,transparent,#d4af37)' }} />
              <span className="text-lg" style={{ color: 'rgba(212,175,55,0.6)' }}>♠ ♥ ♦ ♣</span>
              <div className="h-px w-16" style={{ background: 'linear-gradient(90deg,#d4af37,transparent)' }} />
            </div>

            <h1
              className="font-black uppercase tracking-widest"
              style={{
                fontSize: 'clamp(2.5rem, 8vw, 5rem)',
                background: 'linear-gradient(180deg,#ffe066 0%,#d4af37 45%,#a07820 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                filter: 'drop-shadow(0 0 24px rgba(212,175,55,0.4))',
                letterSpacing: '0.15em',
              }}
            >
              WIN X WIN
            </h1>

            <p
              className="text-xs font-bold uppercase tracking-[0.3em] select-none"
              style={{ color: 'rgba(212,175,55,0.5)' }}
            >
              Leaderboard
            </p>
          </div>

          {/* ── Total pool ── */}
          <div
            className="rounded-2xl py-5 text-center"
            style={{
              background: 'linear-gradient(135deg,rgba(212,175,55,0.1) 0%,rgba(0,0,0,0.8) 100%)',
              border: '1.5px solid rgba(212,175,55,0.3)',
              boxShadow: '0 0 40px rgba(212,175,55,0.08)',
            }}
          >
            <p className="text-xs font-bold uppercase tracking-[0.3em] mb-1" style={{ color: 'rgba(212,175,55,0.5)' }}>
              Total Pool
            </p>
            <p
              className="font-black tabular-nums"
              style={{
                fontSize: 'clamp(2.5rem,10vw,4.5rem)',
                background: 'linear-gradient(180deg,#ffe066,#d4af37)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                filter: 'drop-shadow(0 0 20px rgba(212,175,55,0.5))',
              }}
            >
              ${total.toLocaleString()}
            </p>
            <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.3)' }}>
              {players.length} player{players.length !== 1 ? 's' : ''}
            </p>
          </div>

          {/* ── Gold divider ── */}
          <div className="h-px" style={{ background: 'linear-gradient(90deg,transparent,#d4af37,transparent)' }} />

          {/* ── Rankings ── */}
          {players.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-2xl mb-2">🎰</p>
              <p className="font-bold" style={{ color: 'rgba(212,175,55,0.4)' }}>No players yet</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {players.map((player, i) => (
                <LeaderboardRow key={player.id} player={player} rank={i + 1} />
              ))}
            </div>
          )}

          {/* ── Bottom ornament ── */}
          <div className="flex items-center justify-center gap-3 pt-4 select-none">
            <div className="h-px w-12" style={{ background: 'linear-gradient(90deg,transparent,rgba(212,175,55,0.3))' }} />
            <span className="text-sm" style={{ color: 'rgba(212,175,55,0.25)' }}>♠ ♥ ♦ ♣</span>
            <div className="h-px w-12" style={{ background: 'linear-gradient(90deg,rgba(212,175,55,0.3),transparent)' }} />
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

  return { props: { initialPlayers: data ?? [] } }
}
