import { useState, useEffect, useRef } from 'react'
import Head from 'next/head'
import toast, { Toaster } from 'react-hot-toast'
import type { Completion } from '@/lib/types'

function timeAgo(isoString: string): string {
  const diffMs  = Date.now() - new Date(isoString).getTime()
  const diffSec = Math.floor(diffMs / 1000)
  if (diffSec < 60)  return `${diffSec}s ago`
  const diffMin = Math.floor(diffSec / 60)
  if (diffMin < 60)  return `${diffMin}m ago`
  return `${Math.floor(diffMin / 60)}h ago`
}

export default function DealerPage() {
  const [queue, setQueue]     = useState<Completion[]>([])
  const [rewards, setRewards] = useState<Record<string, string>>({})
  const [acting, setActing]   = useState<Record<string, boolean>>({})
  const prevSigRef            = useRef('')

  useEffect(() => {
    async function poll() {
      try {
        const res = await fetch('/api/completions?status=pending')
        if (!res.ok) return
        const data: Completion[] = await res.json()
        const sig = data.map(d => d.id).join(',')
        if (sig !== prevSigRef.current) {
          prevSigRef.current = sig
          setQueue(data)
          // seed reward inputs for new items
          setRewards(prev => {
            const next = { ...prev }
            data.forEach(c => { if (!(c.id in next)) next[c.id] = '100' })
            return next
          })
        }
      } catch { /* keep last known state */ }
    }
    poll()
    const id = setInterval(poll, 1500)
    return () => clearInterval(id)
  }, [])

  async function handleConfirm(completion: Completion) {
    const reward = parseInt(rewards[completion.id] ?? '100', 10)
    if (isNaN(reward) || reward < 0) { toast.error('Enter a valid reward amount'); return }
    setActing(a => ({ ...a, [completion.id]: true }))
    try {
      const res = await fetch('/api/completions/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: completion.id, reward }),
      })
      if (res.status === 409) { toast.error('Already resolved'); return }
      if (!res.ok) { toast.error('Failed to confirm'); return }
      setQueue(q => q.filter(c => c.id !== completion.id))
      toast.success(`🎰 Awarded +$${reward} to ${completion.player_name}`, {
        duration: 4000,
        style: { background: '#111', color: '#d4af37', border: '1px solid #d4af3760', fontWeight: 'bold' },
      })
    } finally {
      setActing(a => ({ ...a, [completion.id]: false }))
    }
  }

  async function handleReject(completion: Completion) {
    setActing(a => ({ ...a, [completion.id]: true }))
    try {
      const res = await fetch('/api/completions/reject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: completion.id }),
      })
      if (res.status === 409) { toast.error('Already resolved'); return }
      if (!res.ok) { toast.error('Failed to reject'); return }
      setQueue(q => q.filter(c => c.id !== completion.id))
      toast('❌ Rejected', { duration: 2000, style: { background: '#1a0000', color: '#f87171', border: '1px solid #f8717140' } })
    } finally {
      setActing(a => ({ ...a, [completion.id]: false }))
    }
  }

  return (
    <>
      <Head><title>Dealer Queue · Win X Win</title></Head>
      <Toaster position="top-center" />

      <div className="min-h-screen flex flex-col px-4 pt-6 pb-12" style={{ background: '#0a0a0a' }}>
        <div className="w-full max-w-lg mx-auto flex flex-col gap-5">

          {/* ── Header ── */}
          <div className="text-center space-y-1">
            <div className="flex items-center justify-center gap-3 select-none">
              <div className="h-px w-12" style={{ background: 'linear-gradient(90deg,transparent,#d4af37)' }} />
              <span style={{ color: 'rgba(212,175,55,0.5)' }}>♠ ♥ ♦ ♣</span>
              <div className="h-px w-12" style={{ background: 'linear-gradient(90deg,#d4af37,transparent)' }} />
            </div>
            <h1 className="font-black uppercase tracking-widest text-3xl"
              style={{
                background: 'linear-gradient(180deg,#ffe066 0%,#d4af37 50%,#a07820 100%)',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
                filter: 'drop-shadow(0 0 16px rgba(212,175,55,0.4))',
              }}>
              WIN X WIN
            </h1>
            <p className="text-xs font-bold uppercase tracking-[0.3em]" style={{ color: 'rgba(212,175,55,0.5)' }}>
              Dealer Queue
            </p>
            <div
              className="inline-flex items-center gap-2 px-3 py-1 rounded-full mt-1"
              style={{ background: queue.length > 0 ? 'rgba(212,175,55,0.12)' : 'rgba(255,255,255,0.04)', border: '1px solid rgba(212,175,55,0.2)' }}
            >
              <div className="w-2 h-2 rounded-full" style={{ background: queue.length > 0 ? '#d4af37' : 'rgba(255,255,255,0.2)', boxShadow: queue.length > 0 ? '0 0 6px #d4af37' : 'none' }} />
              <span className="text-xs font-bold" style={{ color: queue.length > 0 ? '#d4af37' : 'rgba(255,255,255,0.3)' }}>
                {queue.length} pending
              </span>
            </div>
          </div>

          <div className="h-px" style={{ background: 'linear-gradient(90deg,transparent,#d4af37,transparent)' }} />

          {/* ── Queue ── */}
          {queue.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3 select-none">
              <span className="text-4xl" style={{ color: 'rgba(212,175,55,0.2)' }}>♠ ♥ ♦ ♣</span>
              <p className="font-bold uppercase tracking-widest text-sm" style={{ color: 'rgba(212,175,55,0.3)' }}>
                No pending challenges
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {queue.map(c => (
                <div
                  key={c.id}
                  className="rounded-2xl p-5 flex flex-col gap-4"
                  style={{ background: 'rgba(212,175,55,0.04)', border: '1.5px solid rgba(212,175,55,0.2)' }}
                >
                  {/* Player row */}
                  <div className="flex items-center gap-3">
                    <div className="relative rounded-full overflow-hidden shrink-0"
                      style={{ width: 48, height: 48, border: '2px solid #d4af37', background: '#111' }}>
                      {c.avatar_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={c.avatar_url} alt={c.player_name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center font-black text-xl" style={{ color: '#d4af37' }}>
                          {(c.player_name?.charAt(0) ?? '?').toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-black text-white text-base leading-tight truncate">{c.player_name}</p>
                      <p className="text-xs" style={{ color: 'rgba(212,175,55,0.45)' }}>{timeAgo(c.created_at)}</p>
                    </div>
                  </div>

                  {/* Challenge text */}
                  <p className="text-white font-bold text-lg leading-snug text-center" dir="rtl">
                    {c.challenge_text}
                  </p>

                  <div className="h-px" style={{ background: 'linear-gradient(90deg,transparent,rgba(212,175,55,0.2),transparent)' }} />

                  {/* Reward input + buttons */}
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                      <label className="text-xs font-bold uppercase tracking-widest shrink-0" style={{ color: 'rgba(212,175,55,0.6)' }}>
                        Reward $
                      </label>
                      <input
                        type="number"
                        min={0}
                        value={rewards[c.id] ?? '100'}
                        onChange={e => setRewards(r => ({ ...r, [c.id]: e.target.value }))}
                        className="flex-1 h-10 rounded-xl px-3 font-black text-base text-white text-center outline-none"
                        style={{ background: 'rgba(255,255,255,0.05)', border: '1.5px solid rgba(212,175,55,0.25)' }}
                      />
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => handleConfirm(c)}
                        disabled={acting[c.id]}
                        className="flex-1 py-3 rounded-xl font-black text-sm uppercase tracking-widest transition-all active:scale-95 disabled:opacity-40"
                        style={{ background: 'linear-gradient(135deg,#22c55e,#16a34a)', color: '#fff', boxShadow: '0 0 16px rgba(34,197,94,0.3)' }}
                      >
                        {acting[c.id] ? '…' : '✅ Confirm'}
                      </button>
                      <button
                        onClick={() => handleReject(c)}
                        disabled={acting[c.id]}
                        className="flex-1 py-3 rounded-xl font-black text-sm uppercase tracking-widest transition-all active:scale-95 disabled:opacity-40"
                        style={{ background: 'linear-gradient(135deg,#dc2626,#b91c1c)', color: '#fff', boxShadow: '0 0 16px rgba(220,38,38,0.3)' }}
                      >
                        {acting[c.id] ? '…' : '❌ Reject'}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
