import Image from 'next/image'
import type { Player } from '@/lib/types'

const RANK_LABEL: Record<number, { symbol: string; color: string }> = {
  1: { symbol: '🥇', color: '#FFD700' },
  2: { symbol: '🥈', color: '#C0C0C0' },
  3: { symbol: '🥉', color: '#CD7F32' },
}

interface LeaderboardRowProps {
  player: Player
  rank: number
}

export function LeaderboardRow({ player, rank }: LeaderboardRowProps) {
  const isTop3 = rank <= 3
  const rankInfo = RANK_LABEL[rank]

  return (
    <div
      className="flex items-center gap-4 px-5 py-3 rounded-xl transition-all"
      style={
        isTop3
          ? {
              background: 'linear-gradient(90deg, rgba(212,175,55,0.12) 0%, rgba(0,0,0,0.6) 100%)',
              border: `1px solid rgba(212,175,55,${rank === 1 ? '0.6' : '0.3'})`,
              boxShadow: rank === 1 ? '0 0 20px rgba(212,175,55,0.15)' : 'none',
            }
          : {
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.06)',
            }
      }
    >
      {/* Rank */}
      <div className="w-10 text-center shrink-0">
        {rankInfo ? (
          <span className="text-2xl">{rankInfo.symbol}</span>
        ) : (
          <span
            className="font-black text-lg tabular-nums"
            style={{ color: 'rgba(212,175,55,0.4)' }}
          >
            {rank}
          </span>
        )}
      </div>

      {/* Avatar */}
      <div
        className="relative shrink-0 rounded-full overflow-hidden"
        style={{
          width: isTop3 ? 52 : 44,
          height: isTop3 ? 52 : 44,
          border: `2px solid ${isTop3 ? '#d4af37' : 'rgba(212,175,55,0.25)'}`,
          background: '#111',
        }}
      >
        {player.avatar_url ? (
          <Image src={player.avatar_url} alt={player.name} fill className="object-cover" unoptimized />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center font-black"
            style={{
              fontSize: isTop3 ? '1.3rem' : '1.1rem',
              color: '#d4af37',
            }}
          >
            {(player.name?.charAt(0) ?? '?').toUpperCase()}
          </div>
        )}
      </div>

      {/* Name */}
      <div className="flex-1 min-w-0">
        <p
          className="font-bold truncate"
          style={{
            fontSize: isTop3 ? '1.2rem' : '1rem',
            color: isTop3 ? '#fff' : 'rgba(255,255,255,0.75)',
          }}
        >
          {player.name}
        </p>
      </div>

      {/* Money */}
      <div
        className="font-black tabular-nums shrink-0"
        style={{
          fontSize: isTop3 ? '1.5rem' : '1.2rem',
          color: player.money < 0 ? '#e55' : isTop3 ? '#d4af37' : 'rgba(212,175,55,0.7)',
        }}
      >
        {player.money < 0 ? '-' : '+'}${Math.abs(player.money).toLocaleString()}
      </div>
    </div>
  )
}
