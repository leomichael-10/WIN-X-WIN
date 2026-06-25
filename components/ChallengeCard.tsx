interface ChallengeCardProps {
  text: string | null
  completed: boolean
  loading: boolean
  skipsLeft: number
  onGetNew: () => void
}

export function ChallengeCard({ text, completed, loading, skipsLeft, onGetNew }: ChallengeCardProps) {
  const canSkip = completed && skipsLeft > 0

  return (
    <div
      className="rounded-2xl p-6 text-center space-y-4"
      style={{
        background: 'rgba(212,175,55,0.06)',
        border: '1.5px solid rgba(212,175,55,0.3)',
      }}
    >
      {/* Label */}
      <div className="flex items-center gap-2 justify-center">
        <div className="h-px flex-1" style={{ background: 'linear-gradient(90deg,transparent,rgba(212,175,55,0.4))' }} />
        <p className="text-xs font-bold uppercase tracking-[0.25em]" style={{ color: '#d4af37' }}>
          Your Challenge
        </p>
        <div className="h-px flex-1" style={{ background: 'linear-gradient(90deg,rgba(212,175,55,0.4),transparent)' }} />
      </div>

      {/* Challenge text */}
      {loading ? (
        <p className="text-white/50 text-lg animate-pulse min-h-12 flex items-center justify-center">
          Loading…
        </p>
      ) : (
        <p className="text-white text-xl font-bold leading-snug min-h-12 flex items-center justify-center">
          {text}
        </p>
      )}

      {/* Skip button + counter */}
      <div className="flex flex-col items-center gap-1.5">
        <button
          onClick={onGetNew}
          disabled={!canSkip}
          className="px-6 py-2 rounded-xl text-sm font-black uppercase tracking-widest transition-all active:scale-95 disabled:cursor-not-allowed"
          style={
            canSkip
              ? {
                  background: 'linear-gradient(135deg,#ffe066,#d4af37,#a07820)',
                  color: '#000',
                  boxShadow: '0 0 16px rgba(212,175,55,0.4)',
                }
              : {
                  background: 'rgba(255,255,255,0.05)',
                  color: 'rgba(255,255,255,0.25)',
                  border: '1px solid rgba(255,255,255,0.08)',
                }
          }
        >
          {!completed
            ? '🔒 Complete challenge first'
            : skipsLeft === 0
            ? '🚫 No skips left'
            : '🎲 Skip Challenge'}
        </button>

        {/* Skips remaining indicator */}
        <p className="text-xs" style={{ color: 'rgba(212,175,55,0.45)' }}>
          {skipsLeft === 0
            ? 'You have used all your skips'
            : `${skipsLeft} skip${skipsLeft !== 1 ? 's' : ''} remaining`}
        </p>
      </div>
    </div>
  )
}
