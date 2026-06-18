import { useState } from 'react'
import Head from 'next/head'
import toast, { Toaster } from 'react-hot-toast'
import { Input } from '@/components/ui/input'
import { AvatarUpload } from '@/components/AvatarUpload'
import { ChallengeCard } from '@/components/ChallengeCard'
import { MoneyButtons } from '@/components/MoneyButtons'
import { useChallenges } from '@/hooks/useChallenges'

export default function PlayerPage() {
  const [name, setName] = useState('')
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const { currentChallenge, completed, loading, pickNewChallenge, markCompleted } = useChallenges()

  async function handleMoneySubmit(amount: number) {
    if (!name.trim()) {
      toast.error('Enter your name first!')
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch('/api/players', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          moneyChange: amount,
          avatar_url: avatarUrl,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      markCompleted()
      const formatted = amount >= 0 ? `+$${amount}` : `-$${Math.abs(amount)}`
      toast.success(`${formatted} added! Total: $${data.money}`, {
        icon: amount > 0 ? '🤑' : '💸',
        duration: 3000,
        style: {
          background: '#1e1b4b',
          color: '#fbbf24',
          border: '1px solid #fbbf24',
          fontWeight: 'bold',
        },
      })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <Head>
        <title>Casino Challenge 🎰</title>
      </Head>
      <Toaster position="top-center" />
      <div className="min-h-screen bg-linear-to-b from-black via-purple-950 to-black px-4 py-8">
        <div className="max-w-md mx-auto space-y-6">
          {/* Header */}
          <div className="text-center">
            <h1 className="text-4xl font-black text-yellow-400 drop-shadow-lg">🎰 Casino Night</h1>
            <p className="text-purple-300 mt-1 text-sm">Complete challenges, earn money!</p>
          </div>

          {/* Avatar + Name */}
          <div className="bg-black/40 border border-purple-700/50 rounded-2xl p-6 space-y-4">
            <AvatarUpload onUpload={setAvatarUrl} currentUrl={avatarUrl} />
            <Input
              placeholder="Your name"
              value={name}
              onChange={e => setName(e.target.value)}
              maxLength={32}
              className="text-center text-lg font-bold bg-purple-900/50 border-purple-600 text-white placeholder:text-purple-400 h-12"
            />
          </div>

          {/* Challenge */}
          <ChallengeCard
            text={currentChallenge?.text ?? null}
            completed={completed}
            loading={loading}
            onGetNew={pickNewChallenge}
          />

          {/* Money buttons */}
          <div className="bg-black/40 border border-purple-700/50 rounded-2xl p-6">
            <p className="text-purple-300 text-sm mb-4 text-center">
              How did you do on this challenge?
            </p>
            <MoneyButtons onSubmit={handleMoneySubmit} disabled={submitting} />
          </div>

          {/* Leaderboard link */}
          <div className="text-center">
            <a
              href="/leaderboard"
              className="text-yellow-400 underline underline-offset-4 text-sm hover:text-yellow-300"
            >
              📊 View Leaderboard →
            </a>
          </div>
        </div>
      </div>
    </>
  )
}
