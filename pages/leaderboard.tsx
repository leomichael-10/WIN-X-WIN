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
  const prevSignatureRef = useRef<string>(JSON.stringify(initialPlayers.map(p => `${p.id}:${p.money}:${p.name}`)))

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch('/api/players')
        if (!res.ok) return
        const data: Player[] = await res.json()

        // Only update state if data changed (avoids re-render flicker)
        const newSignature = JSON.stringify(data.map(p => `${p.id}:${p.money}:${p.name}`))
        if (newSignature !== prevSignatureRef.current) {
          prevSignatureRef.current = newSignature
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
      <div className="min-h-screen bg-linear-to-b from-black via-purple-950 to-black px-4 py-8">
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Header */}
          <div className="text-center">
            <h1 className="text-5xl font-black text-yellow-400 drop-shadow-lg tracking-tight">
              🏆 Leaderboard
            </h1>
            <div className="w-full h-px bg-linear-to-r from-transparent via-yellow-400/50 to-transparent mt-4" />
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
