import { useState, useEffect } from 'react'

interface Challenge {
  id: number
  text: string
}

const STORAGE_KEY = 'casino_challenge'
const COMPLETED_KEY = 'casino_challenge_completed'

export function useChallenges() {
  const [challenges, setChallenges] = useState<Challenge[]>([])
  const [currentChallenge, setCurrentChallenge] = useState<Challenge | null>(null)
  const [completed, setCompleted] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/challenges.json')
      .then(r => r.json())
      .then((data: Challenge[]) => {
        setChallenges(data)

        // Restore from localStorage
        const stored = localStorage.getItem(STORAGE_KEY)
        const isCompleted = localStorage.getItem(COMPLETED_KEY) === 'true'

        if (stored) {
          try {
            const parsed: Challenge = JSON.parse(stored)
            // Verify stored challenge still exists in the list
            const stillExists = data.find(c => c.id === parsed.id)
            if (stillExists) {
              setCurrentChallenge(stillExists)
              setCompleted(isCompleted)
              setLoading(false)
              return
            }
          } catch {
            // malformed localStorage — fall through to pick new challenge
          }
        }

        // Pick a random challenge
        const random = data[Math.floor(Math.random() * data.length)]
        setCurrentChallenge(random)
        localStorage.setItem(STORAGE_KEY, JSON.stringify(random))
        localStorage.setItem(COMPLETED_KEY, 'false')
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  function pickNewChallenge() {
    if (!completed || challenges.length === 0) return
    const random = challenges[Math.floor(Math.random() * challenges.length)]
    setCurrentChallenge(random)
    setCompleted(false)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(random))
    localStorage.setItem(COMPLETED_KEY, 'false')
  }

  function markCompleted() {
    setCompleted(true)
    localStorage.setItem(COMPLETED_KEY, 'true')
  }

  return { currentChallenge, completed, loading, pickNewChallenge, markCompleted }
}
