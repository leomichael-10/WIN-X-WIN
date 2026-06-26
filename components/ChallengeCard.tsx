import type { DealerStatus } from '@/hooks/useChallenges'

const MAX_SKIPS = 2

interface ChallengeCardProps {
  text: string | null
  loading: boolean
  skipsLeft: number
  resetCountdown: string
  dealerStatus: DealerStatus
  confirmedReward: number
  onSubmitToDealer: () => void
  onSkip: () => void
}

export function ChallengeCard({
  text, loading, skipsLeft, resetCountdown,
  dealerStatus, confirmedReward, onSubmitToDealer, onSkip,
}: ChallengeCardProps) {

  const isLocked = dealerStatus === 'waiting' || dealerStatus === 'confirmed'

  return (
    <div
      className="rounded-2xl p-5 flex flex-col gap-4"
      style={{
        background: 'rgba(212,175,55,0.05)',
        border: `1.5px solid ${dealerStatus === 'rejected' ? 'rgba(239,68,68,0.4)' : 'rgba(212,175,55,0.28)'}`,
        transition: 'border-color 0.3s',
      }}
    >
      {/* ── Header: label + skip dots ── */}
      <div className="flex items-center justify-between">
        <p className="text-xs font-black uppercase tracking-[0.22em]" style={{ color: '#d4af37' }}>
          🎯 Side Challenge
        </p>

        <div className="flex items-center gap-2">
          <span className="text-xs uppercase tracking-widest" style={{ color: 'rgba(212,175,55,0.45)' }}>Skips</span>
          <div className="flex gap-1.5">
            {Array.from({ length: MAX_SKIPS }).map((_, i) => (
              <div
                key={i}
                className="rounded-full transition-all"
                style={{
                  width: 12, height: 12,
                  background: i < skipsLeft ? '#d4af37' : 'rgba(255,255,255,0.1)',
                  boxShadow: i < skipsLeft ? '0 0 6px rgba(212,175,55,0.7)' : 'none',
                  border: i < skipsLeft ? 'none' : '1.5px solid rgba(255,255,255,0.15)',
                }}
              />
            ))}
          </div>
          <span className="text-xs font-bold tabular-nums" style={{ color: skipsLeft === 0 ? '#f87171' : 'rgba(212,175,55,0.7)' }}>
            {skipsLeft}/{MAX_SKIPS}
          </span>
        </div>
      </div>

      {/* ── Divider ── */}
      <div className="h-px" style={{ background: 'linear-gradient(90deg,transparent,rgba(212,175,55,0.3),transparent)' }} />

      {/* ── Challenge text (RTL) ── */}
      <div className="min-h-16 flex items-center justify-center px-2" dir="rtl">
        {loading ? (
          <p className="text-white/40 text-lg animate-pulse">جاري التحميل…</p>
        ) : (
          <p className="text-white font-bold text-center leading-relaxed" style={{ fontSize: '1.25rem' }}>
            {text}
          </p>
        )}
      </div>

      {/* ── Divider ── */}
      <div className="h-px" style={{ background: 'linear-gradient(90deg,transparent,rgba(212,175,55,0.3),transparent)' }} />

      {/* ── Action area — switches by dealerStatus ── */}

      {/* WAITING */}
      {dealerStatus === 'waiting' && (
        <div
          className="w-full py-4 rounded-xl text-center flex flex-col items-center gap-2"
          style={{ background: 'rgba(212,175,55,0.07)', border: '1.5px solid rgba(212,175,55,0.2)' }}
        >
          <span className="text-2xl animate-spin" style={{ display: 'inline-block', animationDuration: '2s' }}>⏳</span>
          <span className="text-sm font-black uppercase tracking-widest" style={{ color: '#d4af37' }}>
            Waiting for dealer…
          </span>
          <span className="text-xs" style={{ color: 'rgba(212,175,55,0.45)' }}>
            Your challenge is being reviewed
          </span>
        </div>
      )}

      {/* CONFIRMED */}
      {dealerStatus === 'confirmed' && (
        <div
          className="w-full py-4 rounded-xl text-center flex flex-col items-center gap-1"
          style={{ background: 'rgba(34,197,94,0.1)', border: '1.5px solid rgba(34,197,94,0.35)' }}
        >
          <span className="text-3xl">🎰</span>
          <span className="text-lg font-black" style={{ color: '#22c55e' }}>Confirmed!</span>
          <span className="text-2xl font-black tabular-nums" style={{ color: '#d4af37', textShadow: '0 0 12px rgba(212,175,55,0.6)' }}>
            +${confirmedReward}
          </span>
          <span className="text-xs mt-1" style={{ color: 'rgba(34,197,94,0.6)' }}>Next challenge loading…</span>
        </div>
      )}

      {/* REJECTED */}
      {dealerStatus === 'rejected' && (
        <div className="flex flex-col gap-2">
          <div
            className="w-full py-3 rounded-xl text-center flex flex-col items-center gap-1"
            style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)' }}
          >
            <span className="text-sm font-black uppercase tracking-widest" style={{ color: '#f87171' }}>
              ❌ Dealer rejected
            </span>
            <span className="text-xs" style={{ color: 'rgba(239,68,68,0.6)' }}>
              Try again or skip this challenge
            </span>
          </div>
          <button
            onClick={onSubmitToDealer}
            disabled={loading || !text}
            className="w-full py-3.5 rounded-xl font-black text-base uppercase tracking-widest transition-all active:scale-95 disabled:opacity-30"
            style={{ background: 'linear-gradient(135deg,#22c55e,#16a34a)', color: '#fff', boxShadow: '0 0 20px rgba(34,197,94,0.3)' }}
          >
            ✅ Challenge Completed
          </button>
          {skipsLeft > 0 && (
            <button
              onClick={onSkip}
              className="w-full py-2.5 rounded-xl font-bold text-sm uppercase tracking-widest transition-all active:scale-95"
              style={{ background: 'rgba(212,175,55,0.08)', color: 'rgba(212,175,55,0.7)', border: '1.5px solid rgba(212,175,55,0.25)' }}
            >
              ⏭ Skip Challenge
            </button>
          )}
        </div>
      )}

      {/* IDLE — normal state */}
      {dealerStatus === 'idle' && (
        <div className="flex flex-col gap-2">
          <button
            onClick={onSubmitToDealer}
            disabled={loading || !text || isLocked}
            className="w-full py-3.5 rounded-xl font-black text-base uppercase tracking-widest transition-all active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed"
            style={{ background: 'linear-gradient(135deg,#22c55e,#16a34a)', color: '#fff', boxShadow: '0 0 20px rgba(34,197,94,0.35)' }}
          >
            ✅ Challenge Completed
          </button>

          {skipsLeft > 0 ? (
            <button
              onClick={onSkip}
              disabled={loading || !text || isLocked}
              className="w-full py-2.5 rounded-xl font-bold text-sm uppercase tracking-widest transition-all active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed"
              style={{ background: 'rgba(212,175,55,0.08)', color: 'rgba(212,175,55,0.7)', border: '1.5px solid rgba(212,175,55,0.25)' }}
            >
              ⏭ Skip Challenge
            </button>
          ) : (
            <div
              className="w-full py-2.5 rounded-xl text-center flex flex-col items-center gap-0.5"
              style={{ background: 'rgba(255,80,80,0.07)', border: '1px solid rgba(255,80,80,0.15)' }}
            >
              <span className="text-sm font-bold uppercase tracking-widest" style={{ color: 'rgba(255,100,100,0.6)' }}>🚫 No skips remaining</span>
              <span className="text-xs font-black tabular-nums" style={{ color: 'rgba(255,100,100,0.4)' }}>Resets in {resetCountdown}</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
