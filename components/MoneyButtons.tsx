import { useState } from 'react'
import { Input } from '@/components/ui/input'

interface MoneyButtonsProps {
  onSubmit: (amount: number) => void
  disabled: boolean
}

const PRESETS = [
  { label: '+$50',  value:   50, positive: true },
  { label: '+$100', value:  100, positive: true },
  { label: '-$50',  value:  -50, positive: false },
  { label: '-$100', value: -100, positive: false },
]

export function MoneyButtons({ onSubmit, disabled }: MoneyButtonsProps) {
  const [custom, setCustom] = useState('')
  const [animating, setAnimating] = useState<number | null>(null)

  function handlePreset(value: number) {
    setAnimating(value)
    setTimeout(() => setAnimating(null), 300)
    onSubmit(value)
  }

  function handleCustom() {
    const parsed = parseInt(custom, 10)
    if (isNaN(parsed) || parsed === 0) return
    onSubmit(parsed)
    setCustom('')
  }

  return (
    <div className="space-y-3">
      {/* Preset grid */}
      <div className="grid grid-cols-2 gap-3">
        {PRESETS.map(({ label, value, positive }) => (
          <button
            key={value}
            onClick={() => handlePreset(value)}
            disabled={disabled}
            className="py-4 rounded-xl font-black text-lg transition-all active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed"
            style={{
              background: positive
                ? animating === value
                  ? 'linear-gradient(135deg,#22c55e,#16a34a)'
                  : 'linear-gradient(135deg,#16a34a,#15803d)'
                : animating === value
                  ? 'linear-gradient(135deg,#ef4444,#dc2626)'
                  : 'linear-gradient(135deg,#dc2626,#b91c1c)',
              color: '#fff',
              boxShadow: animating === value
                ? `0 0 20px ${positive ? 'rgba(34,197,94,0.5)' : 'rgba(239,68,68,0.5)'}`
                : 'none',
              transform: animating === value ? 'scale(0.95)' : 'scale(1)',
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Custom amount */}
      <div className="flex gap-2">
        <Input
          type="number"
          placeholder="Custom (e.g. 75 or -75)"
          value={custom}
          onChange={e => setCustom(e.target.value)}
          disabled={disabled}
          onKeyDown={e => e.key === 'Enter' && handleCustom()}
          className="text-white placeholder:text-white/30 h-11"
          style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1.5px solid rgba(212,175,55,0.25)',
          }}
        />
        <button
          onClick={handleCustom}
          disabled={disabled || !custom}
          className="px-4 h-11 rounded-xl font-black text-sm text-black whitespace-nowrap transition-all active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed"
          style={{
            background: 'linear-gradient(135deg,#ffe066,#d4af37,#a07820)',
            minWidth: 96,
          }}
        >
          Add Money
        </button>
      </div>
    </div>
  )
}
