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
