import { useState, useEffect, useRef, useCallback } from 'react'

interface Challenge {
  id: number
  text: string
}

export type DealerStatus = 'idle' | 'waiting' | 'confirmed' | 'rejected'

const STORAGE_KEY      = 'casino_challenge'
const COMPLETED_KEY    = 'casino_challenge_completed'
const SKIPS_KEY        = 'casino_challenge_skips'
const SKIPS_RESET_KEY  = 'casino_challenge_skips_reset_at'
const SEEN_KEY         = 'casino_challenge_seen'
const PENDING_KEY      = 'casino_pending_completion'   // stores completion uuid
const MAX_SKIPS        = 2
const RESET_MS         = 30 * 60 * 1000
const POLL_MS          = 4000   // dealer-confirmation status poll (was 1500)

// ── localStorage helpers ─────────────────────────────────────────────────────

function getSkipsUsed(): number {
  const raw = parseInt(localStorage.getItem(SKIPS_KEY) ?? '0', 10)
  return isNaN(raw) ? 0 : raw
}

function getResetAt(): number {
  const raw = parseInt(localStorage.getItem(SKIPS_RESET_KEY) ?? '0', 10)
  return isNaN(raw) ? 0 : raw
}

function resetSkipsIfExpired(): number {
  const now = Date.now()
  const resetAt = getResetAt()
  if (resetAt === 0) {
    localStorage.setItem(SKIPS_RESET_KEY, String(now))
    localStorage.setItem(SKIPS_KEY, '0')
    return 0
  }
  if (now - resetAt >= RESET_MS) {
    localStorage.setItem(SKIPS_KEY, '0')
    localStorage.setItem(SKIPS_RESET_KEY, String(now))
    return 0
  }
  return getSkipsUsed()
}

function getSeenIds(): number[] {
  try { return JSON.parse(localStorage.getItem(SEEN_KEY) ?? '[]') } catch { return [] }
}

function addSeenId(id: number): void {
  const seen = getSeenIds()
  if (!seen.includes(id)) { seen.push(id); localStorage.setItem(SEEN_KEY, JSON.stringify(seen)) }
}

function pickUnseen(all: Challenge[], currentId?: number): Challenge {
  const seen = getSeenIds()
  const unseen = all.filter(c => !seen.includes(c.id) && c.id !== currentId)
  if (unseen.length === 0) {
    const fresh = all.filter(c => c.id !== currentId)
    localStorage.setItem(SEEN_KEY, JSON.stringify(currentId != null ? [currentId] : []))
    return fresh[Math.floor(Math.random() * fresh.length)]
  }
  return unseen[Math.floor(Math.random() * unseen.length)]
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export function useChallenges() {
  const [challenges, setChallenges]             = useState<Challenge[]>([])
  const [currentChallenge, setCurrentChallenge] = useState<Challenge | null>(null)
  const [skipsUsed, setSkipsUsed]               = useState(0)
  const [msUntilReset, setMsUntilReset]         = useState(0)
  const [loading, setLoading]                   = useState(true)

  // Dealer gate state
  const [dealerStatus, setDealerStatus]   = useState<DealerStatus>('idle')
  const [confirmedReward, setConfirmedReward] = useState(0)
  const [pendingId, setPendingId]         = useState<string | null>(null)

  // Keep refs so polling closure can read latest without re-creating interval
  const pendingIdRef      = useRef<string | null>(null)
  const challengesRef     = useRef<Challenge[]>([])
  const currentRef        = useRef<Challenge | null>(null)
  const dealerStatusRef   = useRef<DealerStatus>('idle')

  pendingIdRef.current    = pendingId
  challengesRef.current   = challenges
  currentRef.current      = currentChallenge
  dealerStatusRef.current = dealerStatus

  // ── Skip-reset tick ───────────────────────────────────────────────────────

  const tick = useCallback(() => {
    const elapsed = Date.now() - getResetAt()
    if (elapsed >= RESET_MS) {
      setSkipsUsed(resetSkipsIfExpired())
      setMsUntilReset(RESET_MS)
    } else {
      setMsUntilReset(RESET_MS - elapsed)
    }
  }, [])

  // ── Advance to next challenge (internal, no-repeat) ────────────────────────

  function advanceChallenge(useSkip: boolean) {
    const all     = challengesRef.current
    const current = currentRef.current
    if (all.length === 0) return
    const next = pickUnseen(all, current?.id ?? undefined)
    addSeenId(next.id)
    setCurrentChallenge(next)
    setDealerStatus('idle')
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    localStorage.setItem(COMPLETED_KEY, 'false')
    if (useSkip) {
      const newSkips = getSkipsUsed() + 1
      setSkipsUsed(newSkips)
      localStorage.setItem(SKIPS_KEY, String(newSkips))
    }
  }

  // ── Poll dealer status while waiting ──────────────────────────────────────

  useEffect(() => {
    if (!pendingId) return

    const interval = setInterval(async () => {
      if (!pendingIdRef.current) return
      try {
        const res = await fetch(`/api/completions/status?id=${pendingIdRef.current}`)
        if (!res.ok) return
        const { status, reward } = await res.json()

        if (status === 'confirmed') {
          clearInterval(interval)
          setConfirmedReward(reward)
          setDealerStatus('confirmed')
          localStorage.removeItem(PENDING_KEY)
          setPendingId(null)
          // Brief delay so player sees "Confirmed!" then auto-advance
          setTimeout(() => advanceChallenge(false), 2000)
        } else if (status === 'rejected') {
          clearInterval(interval)
          setDealerStatus('rejected')
          localStorage.removeItem(PENDING_KEY)
          setPendingId(null)
        }
        // 'pending' → keep polling
      } catch { /* keep polling on network error */ }
    }, POLL_MS)

    return () => clearInterval(interval)
  }, [pendingId]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Initial load ──────────────────────────────────────────────────────────

  useEffect(() => {
    fetch('/challenges.json')
      .then(r => r.json())
      .then((data: Challenge[]) => {
        setChallenges(data)
        if (data.length === 0) { setLoading(false); return }

        const currentSkips = resetSkipsIfExpired()
        setSkipsUsed(currentSkips)
        setMsUntilReset(RESET_MS - (Date.now() - getResetAt()))

        // Restore current challenge
        const stored      = localStorage.getItem(STORAGE_KEY)
        if (stored) {
          try {
            const parsed: Challenge = JSON.parse(stored)
            const stillExists = data.find(c => c.id === parsed.id)
            if (stillExists) {
              setCurrentChallenge(stillExists)

              // Restore pending dealer gate if page was refreshed mid-wait
              const savedPending = localStorage.getItem(PENDING_KEY)
              if (savedPending) {
                setPendingId(savedPending)
                setDealerStatus('waiting')
              }

              setLoading(false)
              return
            }
          } catch { /* fall through */ }
        }

        const first = pickUnseen(data)
        addSeenId(first.id)
        setCurrentChallenge(first)
        localStorage.setItem(STORAGE_KEY, JSON.stringify(first))
        localStorage.setItem(COMPLETED_KEY, 'false')
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  useEffect(() => {
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [tick])

  // ── Public API ────────────────────────────────────────────────────────────

  /** "✅ Challenge Completed" — submits to dealer queue, enters waiting state */
  async function submitToDealer(playerName: string, avatarUrl: string | null) {
    if (!currentChallenge || dealerStatus === 'waiting') return
    try {
      const res = await fetch('/api/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          player_name: playerName,
          avatar_url: avatarUrl,
          challenge_text: currentChallenge.text,
        }),
      })
      if (!res.ok) throw new Error('Failed to submit')
      const data = await res.json()
      localStorage.setItem(PENDING_KEY, data.id)
      setPendingId(data.id)
      setDealerStatus('waiting')
    } catch {
      // Silently fail — player can retry
    }
  }

  /** "⏭ Skip" — advances locally, uses 1 skip, no dealer involved */
  function skipChallenge() {
    if (skipsUsed >= MAX_SKIPS || dealerStatus === 'waiting') return
    advanceChallenge(true)
  }

  /** Called by WWB Bank buttons to mark challenge done (separate from dealer gate) */
  function markCompleted() {
    localStorage.setItem(COMPLETED_KEY, 'true')
  }

  const skipsLeft = MAX_SKIPS - skipsUsed
  const totalSecs = Math.max(0, Math.ceil(msUntilReset / 1000))
  const resetCountdown = `${String(Math.floor(totalSecs / 60)).padStart(2, '0')}:${String(totalSecs % 60).padStart(2, '0')}`

  return {
    currentChallenge,
    loading,
    skipsLeft,
    resetCountdown,
    dealerStatus,
    confirmedReward,
    submitToDealer,
    skipChallenge,
    markCompleted,
  }
}
