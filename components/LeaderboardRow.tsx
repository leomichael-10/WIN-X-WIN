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
          ? 'bg-linear-to-r from-yellow-500/20 to-purple-800/40 border border-yellow-400/40'
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
