import { useState, useEffect } from 'react'

interface Challenge {
  id: number
  text: string
}

const STORAGE_KEY = 'casino_challenge'
const COMPLETED_KEY = 'casino_challenge_completed'
const SKIPS_KEY = 'casino_challenge_skips'
const MAX_SKIPS = 2

export function useChallenges() {
  const [challenges, setChallenges] = useState<Challenge[]>([])
  const [currentChallenge, setCurrentChallenge] = useState<Challenge | null>(null)
  const [completed, setCompleted] = useState(false)
  const [skipsUsed, setSkipsUsed] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/challenges.json')
      .then(r => r.json())
      .then((data: Challenge[]) => {
        setChallenges(data)
        if (data.length === 0) { setLoading(false); return }

        const stored = localStorage.getItem(STORAGE_KEY)
        const isCompleted = localStorage.getItem(COMPLETED_KEY) === 'true'
        const skips = parseInt(localStorage.getItem(SKIPS_KEY) ?? '0', 10)
        setSkipsUsed(isNaN(skips) ? 0 : skips)

        if (stored) {
          try {
            const parsed: Challenge = JSON.parse(stored)
            const stillExists = data.find(c => c.id === parsed.id)
            if (stillExists) {
              setCurrentChallenge(stillExists)
              setCompleted(isCompleted)
              setLoading(false)
              return
            }
          } catch { /* fall through */ }
        }

        const random = data[Math.floor(Math.random() * data.length)]
        setCurrentChallenge(random)
        localStorage.setItem(STORAGE_KEY, JSON.stringify(random))
        localStorage.setItem(COMPLETED_KEY, 'false')
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  function pickNewChallenge() {
    if (!completed || challenges.length === 0 || skipsUsed >= MAX_SKIPS) return
    const random = challenges[Math.floor(Math.random() * challenges.length)]
    const newSkips = skipsUsed + 1
    setCurrentChallenge(random)
    setCompleted(false)
    setSkipsUsed(newSkips)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(random))
    localStorage.setItem(COMPLETED_KEY, 'false')
    localStorage.setItem(SKIPS_KEY, String(newSkips))
  }

  function markCompleted() {
    setCompleted(true)
    localStorage.setItem(COMPLETED_KEY, 'true')
  }

  const skipsLeft = MAX_SKIPS - skipsUsed

  return { currentChallenge, completed, loading, skipsLeft, pickNewChallenge, markCompleted }
}
