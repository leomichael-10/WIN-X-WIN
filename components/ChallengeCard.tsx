import { Button } from '@/components/ui/button'

interface ChallengeCardProps {
  text: string | null
  completed: boolean
  loading: boolean
  onGetNew: () => void
}

export function ChallengeCard({ text, completed, loading, onGetNew }: ChallengeCardProps) {
  return (
    <div className="bg-gradient-to-br from-purple-900 to-indigo-900 border border-yellow-400/30 rounded-2xl p-6 text-center space-y-4">
      <p className="text-yellow-400 text-xs font-bold uppercase tracking-widest">Your Challenge</p>
      {loading ? (
        <p className="text-white text-lg animate-pulse">Loading challenge...</p>
      ) : (
        <p className="text-white text-xl font-bold leading-snug min-h-[3rem]">{text}</p>
      )}
      <Button
        onClick={onGetNew}
        disabled={!completed}
        variant="outline"
        className={`border-yellow-400 text-yellow-400 hover:bg-yellow-400 hover:text-black transition-all ${
          !completed ? 'opacity-40 cursor-not-allowed' : 'animate-pulse'
        }`}
      >
        {completed ? '🎲 Get New Challenge' : '🔒 Complete challenge first'}
      </Button>
    </div>
  )
}
